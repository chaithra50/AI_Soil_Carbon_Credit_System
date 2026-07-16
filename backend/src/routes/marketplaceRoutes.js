const express = require('express');
const Farmer = require('../models/Farmer');
const Company = require('../models/Company');
const CarbonCycle = require('../models/CarbonCycle');
const { MarketplaceListing, Transaction } = require('../models/Marketplace');
const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');
const User = require('../models/User');

const router = express.Router();

// --- Farmer: list credits from an already-scored, unlisted cycle ---
router.post('/listings', requireAuth, requireRole('farmer'), async (req, res) => {
  const { cycleId, pricePerCreditINR } = req.body;
  if (!cycleId || !pricePerCreditINR || pricePerCreditINR <= 0) {
    throw ApiError.badRequest('cycleId and a positive pricePerCreditINR are required');
  }

  const farmer = await Farmer.findOne({ user: req.user.id });
  if (!farmer) throw ApiError.notFound('Farmer profile not found');

  const cycle = await CarbonCycle.findOne({ _id: cycleId, farmer: farmer._id });
  if (!cycle) throw ApiError.notFound('Cycle not found');
  if (cycle.listedOnMarketplace) throw ApiError.conflict('Cycle already listed');
  if (cycle.score.creditsEarned <= 0) throw ApiError.badRequest('This cycle earned zero credits and cannot be listed');

  const listing = await MarketplaceListing.create({
    farmer: farmer._id,
    cycle: cycle._id,
    creditsTotal: cycle.score.creditsEarned,
    creditsRemaining: cycle.score.creditsEarned,
    pricePerCreditINR,
  });

  cycle.listedOnMarketplace = true;
  cycle.creditsRemaining = cycle.score.creditsEarned;
  await cycle.save();

  res.status(201).json({ success: true, listing });
});

// --- Public browse (both roles can view; buying is company-only) ---
router.get('/listings', requireAuth, async (req, res) => {
  const listings = await MarketplaceListing.find({ status: 'active' })
    .populate('farmer', 'fullName farm.district farm.state')
    .populate('cycle')
    .sort({ createdAt: -1 });
  res.json({ success: true, listings });
});

// --- Company: buy credits from a listing ---
router.post('/listings/:listingId/buy', requireAuth, requireRole('company'), async (req, res) => {
  const { credits } = req.body;
  if (!credits || credits <= 0) throw ApiError.badRequest('credits must be a positive number');

  const listing = await MarketplaceListing.findById(req.params.listingId);
  if (!listing || listing.status !== 'active') throw ApiError.notFound('Listing not available');
  if (credits > listing.creditsRemaining) throw ApiError.badRequest('Not enough credits remaining in this listing');

  const company = await Company.findOne({ user: req.user.id });
  if (!company) throw ApiError.notFound('Company profile not found');

  const totalPaidINR = credits * listing.pricePerCreditINR;

  const transaction = await Transaction.create({
    listing: listing._id,
    company: company._id,
    farmer: listing.farmer,
    creditsPurchased: credits,
    pricePerCreditINR: listing.pricePerCreditINR,
    totalPaidINR,
    chain: { status: 'not_configured', txHash: null }, // purchase settlement is Mongo-only in this build
  });

  listing.creditsRemaining -= credits;
  if (listing.creditsRemaining === 0) listing.status = 'sold_out';
  await listing.save();

  company.creditsOwned += credits;
  company.totalSpend += totalPaidINR;
  await company.save();

  const farmer = await Farmer.findById(listing.farmer);
  if (farmer) {
    farmer.walletCreditsBalance = Math.max(0, farmer.walletCreditsBalance - credits);
    await farmer.save();

    const farmerUser = await User.findById(farmer.user);
    const notification = await Notification.create({
      user: farmer.user,
      type: 'credits_sold',
      message: `${credits} credits sold for ₹${totalPaidINR}.`,
    });
    const io = req.app.get('io');
    if (io) io.to(`farmer:${farmer._id}`).emit('credits:sold', { credits, totalPaidINR });
    if (farmerUser) {
      const emailResult = await sendNotificationEmail(farmerUser.email, notification.type, notification.message);
      notification.emailSent = emailResult.status === 'sent';
      await notification.save();
    }
  }

  res.status(201).json({ success: true, transaction });
});

router.get('/transactions/mine', requireAuth, requireRole('company'), async (req, res) => {
  const company = await Company.findOne({ user: req.user.id });
  if (!company) throw ApiError.notFound('Company profile not found');
  const transactions = await Transaction.find({ company: company._id }).populate('listing farmer').sort({ createdAt: -1 });
  res.json({ success: true, transactions });
});

module.exports = router;
