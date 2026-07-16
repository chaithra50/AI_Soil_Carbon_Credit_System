const express = require('express');
const Farmer = require('../models/Farmer');
const CarbonCycle = require('../models/CarbonCycle');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('farmer'));

router.get('/history', async (req, res) => {
  const farmer = await Farmer.findOne({ user: req.user.id });
  if (!farmer) throw ApiError.notFound('Farmer profile not found');

  const cycles = await CarbonCycle.find({ farmer: farmer._id })
    .sort({ createdAt: 1 })
    .populate('baselineReading completionReading');

  const chartData = cycles.map((c, i) => ({
    cycleNumber: i + 1,
    score: c.score.value,
    creditsEarned: c.score.creditsEarned,
    carbonStoredTons: c.score.carbonStoredTons,
    direction: c.score.direction,
    completedAt: c.completionReading?.recordedAt || c.createdAt,
  }));

  res.json({
    success: true,
    totalCycles: cycles.length,
    totalCredits: farmer.walletCreditsBalance,
    chartData,
    cycles,
  });
});

module.exports = router;
