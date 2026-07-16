const express = require('express');
const QRCode = require('qrcode');
const Farmer = require('../models/Farmer');
const SensorReading = require('../models/SensorReading');
const CarbonCycle = require('../models/CarbonCycle');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeCarbonScore } = require('../services/carbonScoring');
const blockchainService = require('../services/blockchainService');
const ipfsService = require('../services/ipfsService');

const router = express.Router();
router.use(requireAuth, requireRole('farmer'));

// Generate a Digital Carbon Passport from the farmer's currently active baseline+completion pair.
router.post('/generate', async (req, res) => {
  const farmer = await Farmer.findOne({ user: req.user.id });
  if (!farmer) throw ApiError.notFound('Farmer profile not found');

  const baseline = await SensorReading.findOne({ farmer: farmer._id, readingType: 'baseline', usedInScore: false }).sort({ recordedAt: 1 });
  const completion = await SensorReading.findOne({ farmer: farmer._id, readingType: 'completion', usedInScore: false }).sort({ recordedAt: 1 });

  if (!baseline) throw ApiError.badRequest('missing_baseline: log a baseline reading first');
  if (!completion) throw ApiError.badRequest('missing_completion: log a completion reading first');

  const scoreOutcome = computeCarbonScore(
    { areaHectares: farmer.farm.areaHectares, cropType: farmer.agriculture.cropType, farmingMethod: farmer.agriculture.farmingMethod },
    baseline,
    completion
  );

  if (!scoreOutcome.ok) {
    throw ApiError.badRequest(scoreOutcome.error);
  }

  const explanationHash = ipfsService.sha256(Buffer.from(scoreOutcome.result.explanation));

  // Count prior cycles to derive an on-chain cycle index.
  const priorCycleCount = await CarbonCycle.countDocuments({ farmer: farmer._id });

  const chain = await blockchainService.recordCycleOnChain({
    farmerWalletAddress: req.body.walletAddress || null,
    cycleIndex: priorCycleCount,
    creditsEarned: scoreOutcome.result.creditsEarned,
    explanationHash,
  });
  // recordCycleOnChain returns not_configured/failed cleanly if no wallet/config - never throws.

  const cycle = await CarbonCycle.create({
    farmer: farmer._id,
    baselineReading: baseline._id,
    completionReading: completion._id,
    score: scoreOutcome.result,
    chain,
  });

  baseline.usedInScore = true;
  baseline.cycle = cycle._id;
  completion.usedInScore = true;
  completion.cycle = cycle._id;
  await baseline.save();
  await completion.save();

  farmer.walletCreditsBalance += scoreOutcome.result.creditsEarned;
  await farmer.save();

  const io = req.app.get('io');
  if (io) io.to(`farmer:${farmer._id}`).emit('cycle:scored', cycle);

  res.status(201).json({ success: true, cycle });
});

// Render the QR "Digital Carbon Passport" for a completed cycle.
router.get('/:cycleId/qr', async (req, res) => {
  const farmer = await Farmer.findOne({ user: req.user.id });
  if (!farmer) throw ApiError.notFound('Farmer profile not found');

  const cycle = await CarbonCycle.findOne({ _id: req.params.cycleId, farmer: farmer._id });
  if (!cycle) throw ApiError.notFound('Cycle not found');

  const payload = JSON.stringify({
    farmerId: farmer._id.toString(),
    cycleId: cycle._id.toString(),
    creditsEarned: cycle.score.creditsEarned,
    chainStatus: cycle.chain.status,
    txHash: cycle.chain.txHash,
  });

  const qrDataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', width: 300 });
  res.json({ success: true, qrDataUrl, cycle });
});

module.exports = router;
