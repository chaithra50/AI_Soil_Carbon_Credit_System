const assert = require('node:assert/strict');
const test = require('node:test');
const { computeCarbonScore } = require('../src/services/carbonScoring');

const goodFarmer = { areaHectares: 2, cropType: 'rice', farmingMethod: 'organic' };

function reading(recordedAt, soc) {
  return { recordedAt, metrics: { soilOrganicCarbon: soc } };
}

test('1. improvement earns credits and scores > 0', () => {
  const baseline = reading('2026-01-01T00:00:00Z', 1.2);
  const completion = reading('2026-04-01T00:00:00Z', 1.8);
  const out = computeCarbonScore(goodFarmer, baseline, completion);
  assert.equal(out.ok, true);
  assert.equal(out.result.direction, 'improvement');
  assert.ok(out.result.creditsEarned > 0);
  assert.ok(out.result.score > 0);
});

test('2. decline earns zero credits, never negative', () => {
  const baseline = reading('2026-01-01T00:00:00Z', 1.8);
  const completion = reading('2026-04-01T00:00:00Z', 1.2);
  const out = computeCarbonScore(goodFarmer, baseline, completion);
  assert.equal(out.ok, true);
  assert.equal(out.result.direction, 'decline');
  assert.equal(out.result.creditsEarned, 0);
  assert.ok(out.result.score >= 0);
});

test('3. missing baseline returns clear error, does not throw', () => {
  const completion = reading('2026-04-01T00:00:00Z', 1.8);
  const out = computeCarbonScore(goodFarmer, null, completion);
  assert.equal(out.ok, false);
  assert.equal(out.error, 'missing_baseline');
});

test('4. missing completion returns clear error, does not throw', () => {
  const baseline = reading('2026-01-01T00:00:00Z', 1.2);
  const out = computeCarbonScore(goodFarmer, baseline, null);
  assert.equal(out.ok, false);
  assert.equal(out.error, 'missing_completion');
});

test('5. reversed order (completion before baseline) is rejected', () => {
  const baseline = reading('2026-04-01T00:00:00Z', 1.2);
  const completion = reading('2026-01-01T00:00:00Z', 1.8);
  const out = computeCarbonScore(goodFarmer, baseline, completion);
  assert.equal(out.ok, false);
  assert.equal(out.error, 'reversed_order');
});

test('6. unmapped land (no area) is rejected', () => {
  const farmer = { ...goodFarmer, areaHectares: 0 };
  const baseline = reading('2026-01-01T00:00:00Z', 1.2);
  const completion = reading('2026-04-01T00:00:00Z', 1.8);
  const out = computeCarbonScore(farmer, baseline, completion);
  assert.equal(out.ok, false);
  assert.equal(out.error, 'unmapped_land');
});

test('7. unrecognized crop/method is rejected', () => {
  const badCrop = { ...goodFarmer, cropType: 'dragonfruit' };
  const badMethod = { ...goodFarmer, farmingMethod: 'telepathy' };
  const baseline = reading('2026-01-01T00:00:00Z', 1.2);
  const completion = reading('2026-04-01T00:00:00Z', 1.8);

  const out1 = computeCarbonScore(badCrop, baseline, completion);
  assert.equal(out1.ok, false);
  assert.equal(out1.error, 'unrecognized_crop');

  const out2 = computeCarbonScore(badMethod, baseline, completion);
  assert.equal(out2.ok, false);
  assert.equal(out2.error, 'unrecognized_method');
});
