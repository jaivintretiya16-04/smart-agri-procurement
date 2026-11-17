import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb, query, closeDb } from '../config/db.js';
import { runMigrations } from '../migrations/runner.js';
import { seedAll } from '../seeds/seed_all.js';
import { hashToken } from '../services/bookingService.js';
import app from '../app.js';

let serverInstance;
let baseUrl;
let op1Token;
let farmerToken;
let farmer2Token;
let center1Id;
let wheatCropId;
let testSlotId;

test.before(async () => {
  await initDb();
  await runMigrations();
  await seedAll({ clean: true });

  // Start ephemeral test server
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Login operator 1
  const opRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.lucknow@agriprocure.local', password: 'Operator@12345' }),
  });
  op1Token = (await opRes.json()).token;

  // Login farmer Ramesh
  const farmerRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer.ramesh@agriprocure.local', password: 'Farmer@12345' }),
  });
  farmerToken = (await farmerRes.json()).token;

  // Login farmer Suresh
  const farmer2Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer.suresh@agriprocure.local', password: 'Farmer@12345' }),
  });
  farmer2Token = (await farmer2Res.json()).token;

  // Get Center 1 and Wheat Crop ID
  const c = await query("SELECT id FROM centers WHERE name = 'Lucknow Central Krishi Mandi Samiti'");
  center1Id = c.rows[0].id;

  const cr = await query("SELECT id FROM crops WHERE code = 'wheat'");
  wheatCropId = cr.rows[0].id;

  // Ensure slots for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const slotsRes = await fetch(`${baseUrl}/api/slots/center/${center1Id}?date=${tomorrowStr}`);
  const slotsData = await slotsRes.json();
  testSlotId = slotsData.slots[0].id;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

test('Phase 4 - Atomic Slot Booking & QR Token Generation (FR-05)', async () => {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      centerId: center1Id,
      slotId: testSlotId,
      cropId: wheatCropId,
      estimatedQuintals: 15.0,
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.booking.status, 'confirmed');
  assert.equal(Number(data.booking.estimated_quintals), 15.0);
  assert.ok(data.booking.price_snapshot > 0);
  assert.ok(data.booking.booking_reference.startsWith('AGRI-'));
  assert.ok(data.qrToken);

  // Verify QR token hash in DB matches hash(qrToken)
  const hashed = hashToken(data.qrToken);
  assert.equal(hashed, data.booking.qr_token_hash);
});

test('Phase 4 - Farmer Overlapping Appointment Prevention (AT-06)', async () => {
  // Farmer Ramesh attempts to book the SAME slot (or overlapping window) again
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      centerId: center1Id,
      slotId: testSlotId,
      cropId: wheatCropId,
      estimatedQuintals: 10.0,
    }),
  });

  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'FARMER_SLOT_OVERLAP');
});

test('Phase 4 - Volume / Quintal Capacity Exceeded (AT-05)', async () => {
  // Create a dedicated slot with 50 quintals max
  const slotRes = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 30 minutes', 10, 50.00, 0, 0.00)
    RETURNING id
  `, [center1Id]);
  const smallSlotId = slotRes.rows[0].id;

  // Attempt to book 60 quintals (exceeds 50q max)
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmer2Token}`,
    },
    body: JSON.stringify({
      centerId: center1Id,
      slotId: smallSlotId,
      cropId: wheatCropId,
      estimatedQuintals: 60.0,
    }),
  });

  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'QUINTAL_CAPACITY_EXCEEDED');
});

test('Phase 4 - Concurrency Stress Test: Overbooking Prevention (AT-04)', async () => {
  // Create a slot with capacity for EXACTLY 2 farmers
  const slotRes = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 30 minutes', 2, 100.00, 0, 0.00)
    RETURNING id
  `, [center1Id]);
  const tightSlotId = slotRes.rows[0].id;

  // Create 5 temporary distinct farmer accounts to simulate 5 concurrent requests
  const concurrentTokens = [];
  for (let i = 1; i <= 5; i++) {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Concurrent Farmer ${i}`,
        email: `concurrent.farmer.${Date.now()}.${i}@agriprocure.local`,
        password: 'Password@123',
        mobile: `98765432${i}0`,
      }),
    });
    const regData = await regRes.json();
    concurrentTokens.push(regData.token);
  }

  // Fire 5 concurrent booking requests simultaneously using Promise.all
  const promises = concurrentTokens.map((t) =>
    fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({
        centerId: center1Id,
        slotId: tightSlotId,
        cropId: wheatCropId,
        estimatedQuintals: 10.0,
      }),
    })
  );

  const responses = await Promise.all(promises);
  const statuses = responses.map((r) => r.status);

  const successes = statuses.filter((s) => s === 201).length;
  const rejections = statuses.filter((s) => s === 409).length;

  assert.equal(successes, 2, 'Exactly 2 bookings must succeed for a 2-farmer capacity slot');
  assert.equal(rejections, 3, 'The remaining 3 requests must be rejected with 409 Conflict');

  // Verify in database that reserved_farmers is strictly 2!
  const dbCheck = await query('SELECT reserved_farmers, reserved_quintals FROM slots WHERE id = $1', [tightSlotId]);
  assert.equal(dbCheck.rows[0].reserved_farmers, 2, 'reserved_farmers in DB must be exactly 2');
  assert.equal(Number(dbCheck.rows[0].reserved_quintals), 20.00);
});

test('Phase 4 - Price Snapshotting Immutability (AT-13)', async () => {
  // Query Ramesh's confirmed booking price snapshot
  const bookingsRes = await fetch(`${baseUrl}/api/bookings/my`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  const bookingsData = await bookingsRes.json();
  const initialBooking = bookingsData.bookings[0];
  const originalSnapshot = Number(initialBooking.price_snapshot);

  // Operator now updates the advertised price for wheat
  await fetch(`${baseUrl}/api/centers/${center1Id}/prices`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      cropPrices: [{ cropId: wheatCropId, ratePerQuintal: 2999.00 }],
    }),
  });

  // Re-fetch farmer's booking
  const afterRes = await fetch(`${baseUrl}/api/bookings/my`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  const afterData = await afterRes.json();
  const reloadedBooking = afterData.bookings.find((b) => b.id === initialBooking.id);

  assert.equal(
    Number(reloadedBooking.price_snapshot),
    originalSnapshot,
    'Historical price snapshot must NOT change when operator updates center price'
  );
});

test('Phase 4 - Cancellation & Capacity Release (AT-07)', async () => {
  // Create a fresh booking to test cancellation
  const bRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmer2Token}`,
    },
    body: JSON.stringify({
      centerId: center1Id,
      slotId: testSlotId,
      cropId: wheatCropId,
      estimatedQuintals: 12.0,
    }),
  });
  const { booking } = await bRes.json();

  // Inspect slot capacity before cancellation
  const slotBefore = await query('SELECT reserved_farmers, reserved_quintals FROM slots WHERE id = $1', [testSlotId]);
  const farmersBefore = slotBefore.rows[0].reserved_farmers;
  const quintalsBefore = Number(slotBefore.rows[0].reserved_quintals);

  // Cancel booking
  const cancelRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmer2Token}`,
    },
    body: JSON.stringify({ reason: 'Transport tractor unavailable' }),
  });

  assert.equal(cancelRes.status, 200);
  const cancelData = await cancelRes.json();
  assert.equal(cancelData.booking.status, 'cancelled');

  // Inspect slot capacity after cancellation -> must be released exactly once!
  const slotAfter = await query('SELECT reserved_farmers, reserved_quintals FROM slots WHERE id = $1', [testSlotId]);
  assert.equal(slotAfter.rows[0].reserved_farmers, farmersBefore - 1);
  assert.equal(Number(slotAfter.rows[0].reserved_quintals), quintalsBefore - 12.0);
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});
