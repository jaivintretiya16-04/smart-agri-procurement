import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDb, query, closeDb } from '../config/db.js';
import { runMigrations } from '../migrations/runner.js';
import { seedAll } from '../seeds/seed_all.js';
import { createBooking, hashToken } from '../services/bookingService.js';
import { createWaitlistHold, acceptWaitlistHold } from '../services/queueService.js';
import app from '../app.js';

let serverInstance;
let baseUrl;
let op1Token;
let farmerToken;
let center1Id;
let wheatCropId;

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

  const opRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.lucknow@agriprocure.local', password: 'Operator@12345' }),
  });
  op1Token = (await opRes.json()).token;

  const f1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer.ramesh@agriprocure.local', password: 'Farmer@12345' }),
  });
  farmerToken = (await f1Res.json()).token;

  const c = await query("SELECT id FROM centers WHERE name = 'Lucknow Central Krishi Mandi Samiti'");
  center1Id = c.rows[0].id;

  const cr = await query("SELECT id FROM crops WHERE code = 'wheat'");
  wheatCropId = cr.rows[0].id;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

test('Phase 5 - Idempotent QR Check-in: Duplicate Scan Safety (AT-08)', async () => {
  // Create a slot right now (within check-in window: starts_at = NOW() + 5 mins)
  const slotRes = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '35 minutes', 10, 100.00, 0, 0.00)
    RETURNING id
  `, [center1Id]);
  const activeSlotId = slotRes.rows[0].id;

  const { booking, qrToken } = await createBooking({
    farmerId: (await query("SELECT id FROM users WHERE email = 'farmer.ramesh@agriprocure.local'")).rows[0].id,
    centerId: center1Id,
    slotId: activeSlotId,
    cropId: wheatCropId,
    estimatedQuintals: 10,
  });

  // 1. First QR Scan by Operator
  const scan1Res = await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      centerId: center1Id,
      qrToken,
    }),
  });

  assert.equal(scan1Res.status, 200);
  const scan1Data = await scan1Res.json();
  assert.equal(scan1Data.success, true);
  assert.equal(scan1Data.isRepeat, false);
  assert.ok(scan1Data.tokenNumber > 0);
  assert.equal(scan1Data.queuePosition, 1);

  // 2. Second Scan of the EXACT same QR token
  const scan2Res = await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      centerId: center1Id,
      qrToken,
    }),
  });

  assert.equal(scan2Res.status, 200);
  const scan2Data = await scan2Res.json();
  assert.equal(scan2Data.success, true);
  assert.equal(scan2Data.isRepeat, true, 'Second scan must report isRepeat: true');
  assert.equal(scan2Data.tokenNumber, scan1Data.tokenNumber, 'Must return identical token number');

  // Verify in database that exactly ONE queue entry exists
  const countCheck = await query('SELECT COUNT(*) AS count FROM queue_entries WHERE booking_id = $1', [booking.id]);
  assert.equal(parseInt(countCheck.rows[0].count, 10), 1, 'Database must contain exactly 1 queue entry');
});

test('Phase 5 - Queue Sequence Priority: Slot Time Over Arrival Time (AT-09)', async () => {
  // Create Slot 1 (Starts at NOW() + 5 min) and Slot 2 (Starts at NOW() + 12 min)
  // Both are within the 15-minute check-in window
  const slot1 = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '35 minutes', 10, 100.00, 0, 0.00)
    RETURNING id
  `, [center1Id]);

  const slot2 = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() + INTERVAL '12 minutes', NOW() + INTERVAL '42 minutes', 10, 100.00, 0, 0.00)
    RETURNING id
  `, [center1Id]);

  // Create two distinct dedicated farmers for this priority test
  const fARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priority Farmer A',
      email: `priority.farmer.a.${Date.now()}@agriprocure.local`,
      password: 'Password@123',
      mobile: '9876543201',
    }),
  });
  const fA = (await fARes.json()).user;

  const fBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priority Farmer B',
      email: `priority.farmer.b.${Date.now()}@agriprocure.local`,
      password: 'Password@123',
      mobile: '9876543202',
    }),
  });
  const fB = (await fBRes.json()).user;

  const bookA = await createBooking({
    farmerId: fA.id,
    centerId: center1Id,
    slotId: slot1.rows[0].id,
    cropId: wheatCropId,
    estimatedQuintals: 10,
  });

  const bookB = await createBooking({
    farmerId: fB.id,
    centerId: center1Id,
    slotId: slot2.rows[0].id,
    cropId: wheatCropId,
    estimatedQuintals: 10,
  });

  // Farmer B (Slot 2, later slot) checks in FIRST!
  await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op1Token}` },
    body: JSON.stringify({ centerId: center1Id, qrToken: bookB.qrToken }),
  });

  // Farmer A (Slot 1, earlier slot) checks in SECOND!
  await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op1Token}` },
    body: JSON.stringify({ centerId: center1Id, qrToken: bookA.qrToken }),
  });

  // Query live queue
  const queueRes = await fetch(`${baseUrl}/api/queue/center/${center1Id}`);
  const queueData = await queueRes.json();

  const entryA = queueData.queue.find((q) => q.booking_id === bookA.booking.id);
  const entryB = queueData.queue.find((q) => q.booking_id === bookB.booking.id);

  assert.ok(entryA, 'Entry A must exist in queue');
  assert.ok(entryB, 'Entry B must exist in queue');
  assert.ok(
    entryA.position < entryB.position,
    `Farmer A (Slot 1, 10m) must be ordered ahead of Farmer B (Slot 2, 40m) even though B checked in first! (Pos A: ${entryA.position}, Pos B: ${entryB.position})`
  );
});

test('Phase 5 - Missed Cutoff (+15m) No-Show Processing (AT-10)', async () => {
  // Create a past slot where starts_at was 25 minutes ago
  const pastSlot = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() - INTERVAL '25 minutes', NOW() + INTERVAL '5 minutes', 10, 100.00, 1, 10.00)
    RETURNING id
  `, [center1Id]);

  const fA = await query("SELECT id FROM users WHERE email = 'farmer.ramesh@agriprocure.local'");
  const rawQr = 'agri_qr_late_arrival_test_token';
  const qrHash = hashToken(rawQr);

    const lateRef = 'AGRI-LATE-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const lateBooking = await query(`
    INSERT INTO bookings (
      booking_reference, farmer_id, center_id, slot_id, crop_id,
      estimated_quintals, price_snapshot, status, qr_token_hash
    ) VALUES (
      $1, $2, $3, $4, $5, 10.00, 2275.00, 'confirmed', $6
    ) RETURNING id
  `, [lateRef, fA.rows[0].id, center1Id, pastSlot.rows[0].id, wheatCropId, qrHash]);

  // Attempt to check in past cutoff
  const checkInRes = await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op1Token}` },
    body: JSON.stringify({ centerId: center1Id, qrToken: rawQr }),
  });

  assert.equal(checkInRes.status, 400);
  const checkInData = await checkInRes.json();
  assert.equal(checkInData.code, 'CHECK_IN_EXPIRED_NO_SHOW');

  // Verify status in DB was updated to no_show
  const dbCheck = await query('SELECT status FROM bookings WHERE id = $1', [lateBooking.rows[0].id]);
  assert.equal(dbCheck.rows[0].status, 'no_show');
});

test('Phase 5 - Waitlist 10-Minute Hold Acceptance (AT-11)', async () => {
  const fA = await query("SELECT id FROM users WHERE email = 'farmer.ramesh@agriprocure.local'");
  const slot = await query('SELECT id FROM slots WHERE center_id = $1 LIMIT 1', [center1Id]);

  // Create 10-minute hold
  const hold = await createWaitlistHold({
    farmerId: fA.rows[0].id,
    centerId: center1Id,
    slotId: slot.rows[0].id,
    cropId: wheatCropId,
    quintals: 15.0,
  });

  assert.equal(hold.status, 'offered');
  assert.ok(new Date(hold.expires_at) > new Date());

  // Farmer accepts hold
  const accepted = await acceptWaitlistHold(hold.hold_token, fA.rows[0].id);
  assert.equal(accepted.status, 'offered');

  const checkDb = await query('SELECT status FROM slot_holds WHERE id = $1', [hold.id]);
  assert.equal(checkDb.rows[0].status, 'accepted');
});

test('Phase 5 - Queue Service Lifecycle: Call Next -> Serve -> Complete', async () => {
  // Call next waiting token in queue
  const callRes = await fetch(`${baseUrl}/api/queue/center/${center1Id}/call-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${op1Token}` },
  });
  assert.equal(callRes.status, 200);
  const callData = await callRes.json();
  assert.ok(callData.calledEntry);

  const entryId = callData.calledEntry.id;

  // Move to serving
  const serveRes = await fetch(`${baseUrl}/api/queue/${entryId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op1Token}` },
    body: JSON.stringify({ status: 'serving', centerId: center1Id }),
  });
  assert.equal(serveRes.status, 200);

  // Move to completed
  const completeRes = await fetch(`${baseUrl}/api/queue/${entryId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op1Token}` },
    body: JSON.stringify({ status: 'completed', centerId: center1Id }),
  });
  assert.equal(completeRes.status, 200);
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});
