import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb, query, closeDb } from '../config/db.js';
import { runMigrations } from '../migrations/runner.js';
import { seedAll } from '../seeds/seed_all.js';
import { calculateHaversineDistance } from '../services/recommendationService.js';
import app from '../app.js';

let serverInstance;
let baseUrl;
let farmerToken;

test.before(async () => {
  await initDb();
  await runMigrations();
  await seedAll({ clean: true });

  // Start ephemeral server
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const farmerRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer.ramesh@agriprocure.local', password: 'Farmer@12345' }),
  });
  farmerToken = (await farmerRes.json()).token;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});

test('Phase 3 - Haversine Distance Calculation Accuracy (FR-03)', () => {
  // BKT Farmer coordinates: 26.9800, 80.9200
  // Sitapur Road Central Mandi: 26.9124, 80.9324
  const distance = calculateHaversineDistance(26.9800, 80.9200, 26.9124, 80.9324);
  assert.ok(distance > 7.0 && distance < 8.5, `Expected ~7.6 km, got ${distance}`);

  // Distance to self is 0
  assert.equal(calculateHaversineDistance(26.9800, 80.9200, 26.9800, 80.9200), 0);

  // Missing coordinates return null
  assert.equal(calculateHaversineDistance(null, 80.9200, 26.9124, 80.9324), null);
  assert.equal(calculateHaversineDistance(26.9800, 80.9200, undefined, undefined), null);
});

test('Phase 3 - Crop Comparison Across Gov & Private Centers with Indicative Earnings (AT-03)', async () => {
  const res = await fetch(`${baseUrl}/api/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cropCode: 'wheat',
      quantityQuintals: 20,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.recommendations.length >= 4);

  // Assert both government and private centers appear with indicative pricing
  const types = data.recommendations.map((c) => c.type);
  assert.ok(types.includes('government'), 'Must include government mandis');
  assert.ok(types.includes('private'), 'Must include private centers');

  for (const c of data.recommendations) {
    assert.ok(c.matchedCrop.price_per_quintal > 2000, 'Price must be realistic quintal rate');
    assert.equal(
      c.estimatedEarnings,
      Math.round(20 * c.matchedCrop.price_per_quintal * 100) / 100,
      'Estimated earnings must equal quantity * price'
    );
  }
});

test('Phase 3 - Balanced 40/30/20/10 Recommendation Algorithm with Location (FR-04)', async () => {
  const res = await fetch(`${baseUrl}/api/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`, // Farmer Ramesh has coordinates (26.9800, 80.9200)
    },
    body: JSON.stringify({
      cropCode: 'wheat',
      quantityQuintals: 15,
      latitude: 26.9800,
      longitude: 80.9200,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const topCenter = data.recommendations[0];
  assert.ok(topCenter.recommendationScore > 0, 'Must have computed recommendation score');
  assert.ok(topCenter.distanceKm !== null, 'Distance must be computed');
  assert.ok(topCenter.factorBreakdown.price, 'Must have price breakdown');
  assert.ok(topCenter.factorBreakdown.distance, 'Must have distance breakdown');
  assert.ok(topCenter.factorBreakdown.earliestSlot, 'Must have slot breakdown');
  assert.ok(topCenter.factorBreakdown.waitTime, 'Must have wait time breakdown');

  // Verify list is sorted in descending score order
  for (let i = 0; i < data.recommendations.length - 1; i++) {
    assert.ok(
      data.recommendations[i].recommendationScore >= data.recommendations[i + 1].recommendationScore,
      'Recommendations must be sorted descending by recommendationScore'
    );
  }
});

test('Phase 3 - Missing Location Handling & Weight Renormalization (FR-04)', async () => {
  // Query with NO coordinates
  const res = await fetch(`${baseUrl}/api/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cropCode: 'mustard',
      quantityQuintals: 10,
      // No latitude/longitude
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  for (const c of data.recommendations) {
    assert.equal(c.distanceKm, null, 'Missing distance must remain null and not be faked as 0');
    // Distance factor should be absent from breakdown
    assert.equal(c.factorBreakdown.distance, undefined);
    // Remaining weights (price 0.40, slot 0.20, wait 0.10) must rebalance to 100%
    const totalNormalizedWeight =
      c.factorBreakdown.price.normalizedWeight +
      c.factorBreakdown.earliestSlot.normalizedWeight +
      c.factorBreakdown.waitTime.normalizedWeight;
    assert.ok(Math.abs(totalNormalizedWeight - 1.0) < 0.05, 'Remaining weights must sum to 1.0');
  }
});

test('Phase 3 - Input Validation for Recommendations API', async () => {
  // 1. Missing crop
  const res1 = await fetch(`${baseUrl}/api/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantityQuintals: 10 }),
  });
  assert.equal(res1.status, 400);
  const data1 = await res1.json();
  assert.equal(data1.code, 'MISSING_CROP');

  // 2. Non-positive quantity
  const res2 = await fetch(`${baseUrl}/api/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cropCode: 'wheat', quantityQuintals: -5 }),
  });
  assert.equal(res2.status, 400);
  const data2 = await res2.json();
  assert.equal(data2.code, 'INVALID_QUANTITY');
});
