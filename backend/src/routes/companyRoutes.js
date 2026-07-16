const express = require('express');
const Company = require('../models/Company');
const { Transaction } = require('../models/Marketplace');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('company'));

router.get('/me', async (req, res) => {
  const company = await Company.findOne({ user: req.user.id });
  if (!company) throw ApiError.notFound('Company profile not found');
  res.json({ success: true, company });
});

router.put('/me', async (req, res) => {
  const company = await Company.findOne({ user: req.user.id });
  if (!company) throw ApiError.notFound('Company profile not found');

  const { companyName, industry, registrationNumber, address, carbonCreditRequirement } = req.body;
  if (companyName) company.companyName = companyName;
  if (industry) company.industry = industry;
  if (registrationNumber) company.registrationNumber = registrationNumber;
  if (address) company.address = address;
  if (carbonCreditRequirement != null) company.carbonCreditRequirement = carbonCreditRequirement;

  await company.save();
  res.json({ success: true, company });
});

// Dashboard summary: profile + totals + purchase history with a verify-on-chain link per purchase.
router.get('/dashboard', async (req, res) => {
  const company = await Company.findOne({ user: req.user.id });
  if (!company) throw ApiError.notFound('Company profile not found');

  const purchases = await Transaction.find({ company: company._id }).populate('listing farmer').sort({ createdAt: -1 });

  const purchaseHistory = purchases.map((t) => ({
    id: t._id,
    creditsPurchased: t.creditsPurchased,
    totalPaidINR: t.totalPaidINR,
    farmer: t.farmer,
    chainStatus: t.chain.status,
    verifyOnChainUrl:
      t.chain.status === 'confirmed' && t.chain.txHash ? `https://amoy.polygonscan.com/tx/${t.chain.txHash}` : null,
    createdAt: t.createdAt,
  }));

  res.json({
    success: true,
    profile: company,
    totals: { creditsOwned: company.creditsOwned, totalSpend: company.totalSpend },
    purchaseHistory,
  });
});

module.exports = router;
