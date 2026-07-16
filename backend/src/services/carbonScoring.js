/**
 * Carbon scoring engine.
 *
 * IMPORTANT: this is a transparent, formula-based estimator using IPCC-style
 * sequestration ranges for soil organic carbon (SOC) change under different
 * farming methods and crop types. It is NOT a trained ML model - see the
 * as-built spec for why (no real training data). computeCarbonScore() is a
 * pure function: same inputs always produce the same output, no I/O, no
 * randomness, no hidden state. That's what makes it directly unit-testable.
 *
 * The function signature intentionally takes plain objects (not Mongoose
 * documents) so it has zero dependency on the database layer.
 */

// Crop types the engine recognizes, each with a baseline sequestration
// potential multiplier (tons CO2e per hectare per % SOC point gained).
const RECOGNIZED_CROPS = {
  rice: 1.05,
  wheat: 0.95,
  maize: 1.0,
  sugarcane: 1.15,
  cotton: 0.85,
  pulses: 1.1, // legumes fix nitrogen, slightly better SOC building
  millets: 0.9,
  vegetables: 0.8,
};

// Farming methods the engine recognizes, each with a practice multiplier.
// Regenerative/low-till practices get credit for sequestration efficiency.
const RECOGNIZED_METHODS = {
  organic: 1.2,
  conventional: 1.0,
  zero_tillage: 1.25,
  agroforestry: 1.35,
  crop_rotation: 1.15,
  mixed_farming: 1.1,
};

const CO2E_PER_SOC_POINT_PER_HECTARE = 4.5; // tons CO2e per 1% SOC increase per hectare (IPCC-style rule of thumb)
const CREDIT_PER_TON_CO2E = 1; // 1 credit == 1 ton CO2e stored, per the spec's conversion rule

function isRecognizedCrop(crop) {
  return typeof crop === 'string' && Object.prototype.hasOwnProperty.call(RECOGNIZED_CROPS, crop.toLowerCase());
}

function isRecognizedMethod(method) {
  return typeof method === 'string' && Object.prototype.hasOwnProperty.call(RECOGNIZED_METHODS, method.toLowerCase());
}

/**
 * @param {object} farmer - { areaHectares, cropType, farmingMethod }
 * @param {object} baseline - { recordedAt, metrics: { soilOrganicCarbon, ... } }
 * @param {object} completion - { recordedAt, metrics: { soilOrganicCarbon, ... } }
 * @returns {{ ok: true, result: object } | { ok: false, error: string }}
 */
function computeCarbonScore(farmer, baseline, completion) {
  // --- Input validation: every bad input returns a clear error, never throws ---
  if (!farmer || typeof farmer !== 'object') {
    return { ok: false, error: 'missing_farmer' };
  }
  if (!baseline) {
    return { ok: false, error: 'missing_baseline' };
  }
  if (!completion) {
    return { ok: false, error: 'missing_completion' };
  }
  if (!farmer.areaHectares || farmer.areaHectares <= 0) {
    return { ok: false, error: 'unmapped_land' };
  }
  if (!isRecognizedCrop(farmer.cropType)) {
    return { ok: false, error: 'unrecognized_crop' };
  }
  if (!isRecognizedMethod(farmer.farmingMethod)) {
    return { ok: false, error: 'unrecognized_method' };
  }

  const baselineSOC = baseline?.metrics?.soilOrganicCarbon;
  const completionSOC = completion?.metrics?.soilOrganicCarbon;

  if (typeof baselineSOC !== 'number' || Number.isNaN(baselineSOC)) {
    return { ok: false, error: 'missing_baseline_soc' };
  }
  if (typeof completionSOC !== 'number' || Number.isNaN(completionSOC)) {
    return { ok: false, error: 'missing_completion_soc' };
  }

  const baselineTime = new Date(baseline.recordedAt).getTime();
  const completionTime = new Date(completion.recordedAt).getTime();
  if (Number.isNaN(baselineTime) || Number.isNaN(completionTime)) {
    return { ok: false, error: 'invalid_reading_timestamps' };
  }
  if (completionTime <= baselineTime) {
    return { ok: false, error: 'reversed_order' };
  }

  // --- Core formula ---
  const cropMult = RECOGNIZED_CROPS[farmer.cropType.toLowerCase()];
  const methodMult = RECOGNIZED_METHODS[farmer.farmingMethod.toLowerCase()];
  const socDelta = completionSOC - baselineSOC; // can be negative (decline)

  let direction = 'flat';
  if (socDelta > 0.001) direction = 'improvement';
  else if (socDelta < -0.001) direction = 'decline';

  // Raw sequestration: SOC delta * hectares * IPCC conversion factor * multipliers.
  // Decline never goes negative - credits floor at 0, per spec ("never negative").
  const rawCarbonStoredTons =
    socDelta * farmer.areaHectares * CO2E_PER_SOC_POINT_PER_HECTARE * cropMult * methodMult;
  const carbonStoredTons = Math.max(0, round2(rawCarbonStoredTons));

  const creditsEarned = round2(carbonStoredTons * CREDIT_PER_TON_CO2E);

  // Score: 0-100, scaled off SOC delta as a percentage of a "strong" 1.5-point
  // gain being 100. Decline compresses the score toward 0 but never below it.
  const scoreRaw = direction === 'decline' ? 0 : Math.min(100, (socDelta / 1.5) * 100);
  const score = round2(Math.max(0, scoreRaw));

  // Confidence: higher when the cycle spans a reasonable farming duration
  // (30-180 days is the expected window) and lower for very short/long gaps,
  // since SOC change over an implausible timespan is less trustworthy.
  const cycleDays = (completionTime - baselineTime) / (1000 * 60 * 60 * 24);
  let confidence = 0.9;
  if (cycleDays < 20) confidence = 0.5;
  else if (cycleDays < 30) confidence = 0.75;
  else if (cycleDays > 240) confidence = 0.6;
  confidence = round2(confidence);

  const explanation = buildExplanation({
    direction,
    socDelta,
    cropType: farmer.cropType,
    farmingMethod: farmer.farmingMethod,
    carbonStoredTons,
    cycleDays: Math.round(cycleDays),
  });

  return {
    ok: true,
    result: {
      score,
      carbonStoredTons,
      creditsEarned,
      confidence,
      direction,
      explanation,
    },
  };
}

function buildExplanation({ direction, socDelta, cropType, farmingMethod, carbonStoredTons, cycleDays }) {
  const pct = Math.abs(socDelta).toFixed(2);
  if (direction === 'improvement') {
    return `Soil organic carbon rose by ${pct} points over ${cycleDays} days under ${farmingMethod} ${cropType} farming, an estimated ${carbonStoredTons} tons CO2e sequestered.`;
  }
  if (direction === 'decline') {
    return `Soil organic carbon fell by ${pct} points over ${cycleDays} days. No credits are earned for a decline, but the score never goes negative.`;
  }
  return `Soil organic carbon was essentially unchanged (${pct} points) over ${cycleDays} days; no meaningful sequestration detected.`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = {
  computeCarbonScore,
  RECOGNIZED_CROPS,
  RECOGNIZED_METHODS,
  isRecognizedCrop,
  isRecognizedMethod,
};
