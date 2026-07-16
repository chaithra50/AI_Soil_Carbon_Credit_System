const express = require('express');
const Farmer = require('../models/Farmer');
const SensorReading = require('../models/SensorReading');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');
const weatherService = require('../services/weatherService');

const router = express.Router();
router.use(requireAuth, requireRole('farmer'));

async function getOwnFarmer(userId) {
  const farmer = await Farmer.findOne({ user: userId });
  if (!farmer) throw ApiError.notFound('Farmer profile not found');
  return farmer;
}

// Cycle status: is there an active (unconsumed) baseline / completion right now?
router.get('/cycle-status', async (req, res) => {
  const farmer = await getOwnFarmer(req.user.id);
  const activeBaseline = await SensorReading.findOne({
    farmer: farmer._id,
    readingType: 'baseline',
    usedInScore: false,
  }).sort({ recordedAt: -1 });
  const activeCompletion = await SensorReading.findOne({
    farmer: farmer._id,
    readingType: 'completion',
    usedInScore: false,
  }).sort({ recordedAt: -1 });

  res.json({
    success: true,
    hasActiveBaseline: Boolean(activeBaseline),
    hasActiveCompletion: Boolean(activeCompletion),
    activeBaseline,
    activeCompletion,
    readyToScore: Boolean(activeBaseline && activeCompletion),
  });
});

router.post('/', async (req, res) => {
  const { readingType, metrics, recordedAt, fetchWeather } = req.body;
  if (!['baseline', 'completion', 'routine'].includes(readingType)) {
    throw ApiError.badRequest('readingType must be baseline, completion, or routine');
  }

  const farmer = await getOwnFarmer(req.user.id);

  // --- Server-side ordering enforcement (this is the whole point of the two-reading model) ---
  if (readingType === 'baseline') {
    const existingActive = await SensorReading.findOne({ farmer: farmer._id, readingType: 'baseline', usedInScore: false });
    if (existingActive) {
      throw ApiError.conflict('An active baseline already exists for this cycle. Log a completion or score the current cycle first.');
    }
  }

  if (readingType === 'completion') {
    const activeBaseline = await SensorReading.findOne({ farmer: farmer._id, readingType: 'baseline', usedInScore: false });
    if (!activeBaseline) throw ApiError.badRequest('No active baseline exists. Log a baseline reading first.');

    const existingActiveCompletion = await SensorReading.findOne({ farmer: farmer._id, readingType: 'completion', usedInScore: false });
    if (existingActiveCompletion) {
      throw ApiError.conflict('An active completion already exists for this cycle. Score the current cycle before logging another.');
    }
  }

  let weather = { status: 'not_configured', rainfallMm: null, tempC: null, humidityPct: null, fetchedAt: null };
  if (fetchWeather && farmer.farm?.centroid?.lat != null && farmer.farm?.centroid?.lng != null) {
    weather = await weatherService.fetchWeather(farmer.farm.centroid.lat, farmer.farm.centroid.lng);
  }

  const reading = await SensorReading.create({
    farmer: farmer._id,
    readingType,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    metrics: metrics || {},
    weather,
    source: 'manual_form',
  });

  // Live dashboard feed
  const io = req.app.get('io');
  if (io) io.to(`farmer:${farmer._id}`).emit('reading:new', reading);

  res.status(201).json({ success: true, reading });
});

router.get('/', async (req, res) => {
  const farmer = await getOwnFarmer(req.user.id);
  const { readingType, limit = 50 } = req.query;
  const filter = { farmer: farmer._id };
  if (readingType) filter.readingType = readingType;

  const readings = await SensorReading.find(filter).sort({ recordedAt: -1 }).limit(Number(limit));
  res.json({ success: true, readings });
});

module.exports = router;
