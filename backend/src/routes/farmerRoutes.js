const express = require('express');
const Farmer = require('../models/Farmer');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isRecognizedCrop, isRecognizedMethod, RECOGNIZED_CROPS, RECOGNIZED_METHODS } = require('../services/carbonScoring');

const router = express.Router();
router.use(requireAuth, requireRole('farmer'));

async function getOwnFarmer(userId) {
  const farmer = await Farmer.findOne({ user: userId });
  if (!farmer) throw ApiError.notFound('Farmer profile not found');
  return farmer;
}

// Recognized crop/method values, so the frontend dropdowns always match the scoring engine.
router.get('/scoring-options', (req, res) => {
  res.json({ success: true, crops: Object.keys(RECOGNIZED_CROPS), methods: Object.keys(RECOGNIZED_METHODS) });
});

router.get('/me', async (req, res) => {
  const farmer = await getOwnFarmer(req.user.id);
  res.json({ success: true, farmer });
});

router.put('/me', async (req, res) => {
  const farmer = await getOwnFarmer(req.user.id);
  const { fullName, aadhaarNumber, landSurveyNumber, farm, agriculture } = req.body;

  if (fullName) farmer.fullName = fullName;
  if (aadhaarNumber) farmer.aadhaarNumber = aadhaarNumber;
  if (landSurveyNumber) farmer.landSurveyNumber = landSurveyNumber;

  if (farm) {
    farmer.farm = { ...farmer.farm.toObject(), ...farm };
  }

  if (agriculture) {
    if (agriculture.cropType && !isRecognizedCrop(agriculture.cropType)) {
      throw ApiError.badRequest(`Unrecognized crop type: ${agriculture.cropType}`);
    }
    if (agriculture.farmingMethod && !isRecognizedMethod(agriculture.farmingMethod)) {
      throw ApiError.badRequest(`Unrecognized farming method: ${agriculture.farmingMethod}`);
    }
    farmer.agriculture = { ...farmer.agriculture.toObject(), ...agriculture };
  }

  await farmer.save();
  res.json({ success: true, farmer });
});

// Save the drawn polygon + computed area (area/centroid computed client-side via Turf.js)
router.put('/me/boundary', async (req, res) => {
  const { boundary, areaHectares, centroid } = req.body;
  if (!Array.isArray(boundary) || boundary.length < 3) {
    throw ApiError.badRequest('boundary must be a polygon with at least 3 points');
  }
  if (!areaHectares || areaHectares <= 0) throw ApiError.badRequest('areaHectares must be a positive number');

  const farmer = await getOwnFarmer(req.user.id);
  farmer.farm.boundary = boundary;
  farmer.farm.areaHectares = areaHectares;
  if (centroid) farmer.farm.centroid = centroid;
  await farmer.save();

  res.json({ success: true, farm: farmer.farm });
});

module.exports = router;
