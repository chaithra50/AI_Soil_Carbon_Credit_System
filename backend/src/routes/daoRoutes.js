const express = require('express');
const { Proposal, Vote } = require('../models/Dao');
const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { requireAuth } = require('../middleware/auth');
const blockchainService = require('../services/blockchainService');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();
router.use(requireAuth); // both farmers and companies can participate in DAO governance

router.post('/proposals', async (req, res) => {
  const { title, description, votingDays } = req.body;
  if (!title || !description) throw ApiError.badRequest('title and description are required');

  const votingClosesAt = new Date(Date.now() + (Number(votingDays) || 7) * 24 * 60 * 60 * 1000);

  const proposal = await Proposal.create({
    createdBy: req.user.id,
    title,
    description,
    votingClosesAt,
  });

  // Notify everyone is out of scope for this build (would need a broadcast list);
  // emit a socket event for anyone subscribed to the DAO room instead.
  const io = req.app.get('io');
  if (io) io.to('dao').emit('proposal:created', proposal);

  res.status(201).json({ success: true, proposal });
});

router.get('/proposals', async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  // Auto-close proposals whose voting window has passed.
  await closeExpiredProposals();

  const proposals = await Proposal.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, proposals });
});

router.get('/proposals/:id', async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw ApiError.notFound('Proposal not found');
  res.json({ success: true, proposal });
});

router.post('/proposals/:id/vote', async (req, res) => {
  const { choice, walletAddress } = req.body; // choice: 'yes' | 'no'
  if (!['yes', 'no'].includes(choice)) throw ApiError.badRequest('choice must be yes or no');

  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw ApiError.notFound('Proposal not found');
  if (proposal.status !== 'open' || proposal.votingClosesAt < new Date()) {
    throw ApiError.conflict('Voting has closed for this proposal');
  }

  try {
    await Vote.create({ proposal: proposal._id, voter: req.user.id, choice });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('You have already voted on this proposal');
    throw err;
  }

  if (choice === 'yes') proposal.yesCount += 1;
  else proposal.noCount += 1;

  const chain = await blockchainService.recordVoteOnChain({
    proposalOnChainId: proposal._id.toString(),
    voterWalletAddress: walletAddress || null,
    choiceYes: choice === 'yes',
  });
  proposal.chain = { ...proposal.chain, ...chain };

  await proposal.save();

  const io = req.app.get('io');
  if (io) io.to('dao').emit('proposal:vote', { proposalId: proposal._id, yesCount: proposal.yesCount, noCount: proposal.noCount });

  res.json({ success: true, proposal });
});

async function closeExpiredProposals() {
  const expired = await Proposal.find({ status: 'open', votingClosesAt: { $lt: new Date() } });
  for (const p of expired) {
    p.status = 'closed';
    p.result = p.yesCount > p.noCount ? 'passed' : 'rejected';
    await p.save();

    const creator = await User.findById(p.createdBy);
    if (creator) {
      const notification = await Notification.create({
        user: creator._id,
        type: 'proposal_closed',
        message: `Your proposal "${p.title}" closed as ${p.result} (${p.yesCount} yes / ${p.noCount} no).`,
      });
      const emailResult = await sendNotificationEmail(creator.email, notification.type, notification.message);
      notification.emailSent = emailResult.status === 'sent';
      await notification.save();
    }
  }
}

module.exports = router;
