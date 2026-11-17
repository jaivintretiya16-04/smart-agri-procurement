import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb, query, closeDb } from '../config/db.js';
import { runMigrations } from '../migrations/runner.js';
import { seedAll } from '../seeds/seed_all.js';
import app from '../app.js';

let serverInstance;
let baseUrl;
let adminToken;
let opToken;
let farmerToken;
let centerId;
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

  // Admin Login
  const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@agriprocure.local', password: 'Admin@12345' }),
  });
  adminToken = (await adminRes.json()).token;

  // Operator Login (Lucknow Central Mandi)
  const opRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.lucknow@agriprocure.local', password: 'Operator@12345' }),
  });
  opToken = (await opRes.json()).token;

  const c = await query("SELECT id FROM centers WHERE name = 'Lucknow Central Krishi Mandi Samiti'");
  centerId = c.rows[0].id;

  const cr = await query("SELECT id FROM crops WHERE code = 'wheat'");
  wheatCropId = cr.rows[0].id;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

test('Phase 8 - Demo Simulation & Virtual Time Controller Isolation (AT-20)', async () => {
  // 1. Initialize demo scenario
  const initRes = await fetch(`${baseUrl}/api/demo/scenario/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioName: 'e2e_college_demo' }),
  });
  assert.equal(initRes.status, 200);
  const initData = await initRes.json();
  assert.ok(initData.scenario.virtual_time);
  assert.equal(initData.scenario.is_active, true);
  const startTime = new Date(initData.scenario.virtual_time).getTime();

  // 2. Advance virtual time by +45 minutes
  const advRes = await fetch(`${baseUrl}/api/demo/time/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioName: 'e2e_college_demo', minutes: 45 }),
  });
  assert.equal(advRes.status, 200);
  const advData = await advRes.json();
  const advancedTime = new Date(advData.virtualTime).getTime();

  // Difference should be ~45 minutes (2700000 ms)
  const diffMinutes = Math.round((advancedTime - startTime) / 60000);
  assert.equal(diffMinutes, 45);

  // 3. Query demo state & metrics
  const stateRes = await fetch(`${baseUrl}/api/demo/state?scenarioName=e2e_college_demo`);
  assert.equal(stateRes.status, 200);
  const stateData = await stateRes.json();
  assert.equal(stateData.isActive, true);
  assert.ok(stateData.simulationMetrics.farmerCount >= 2);
  assert.ok(stateData.simulationMetrics.centerCount >= 5);

  // 4. Reset scenario
  const resetRes = await fetch(`${baseUrl}/api/demo/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioName: 'e2e_college_demo' }),
  });
  assert.equal(resetRes.status, 200);
});

test('Phase 8 - Complete End-to-End Golden Flow Walkthrough (AT-01 to AT-20)', async () => {
  // ========================================================
  // STEP 1: Farmer Registration & Authentication (AT-01)
  // ========================================================
  const testFarmerEmail = `radhe.${Date.now()}@agriprocure.e2e`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Radhe Shyam Farmer',
      email: testFarmerEmail,
      mobile: '9871122334',
      password: 'Farmer@12345',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      village: 'Bakshi Ka Talab',
      preferred_language: 'hi',
    }),
  });
  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  farmerToken = regData.token;
  assert.ok(farmerToken);
  assert.equal(regData.user.preferred_language, 'hi');

  // ========================================================
  // STEP 2: Intelligent Balanced Center Discovery (AT-03)
  // ========================================================
  const recRes = await fetch(`${baseUrl}/api/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      cropCode: 'wheat',
      quantityQuintals: 40,
      latitude: 26.9124,
      longitude: 80.9324,
    }),
  });
  assert.equal(recRes.status, 200);
  const recData = await recRes.json();
  assert.ok(recData.recommendations.length >= 2);
  const topCenter = recData.recommendations[0];
  assert.ok(topCenter.recommendationScore >= 80);
  const guaranteedRate = topCenter.matchedCrop.price_per_quintal;
  assert.ok(guaranteedRate > 0);

  // ========================================================
  // STEP 3: Atomic Slot Booking & Price Snapshotting (AT-04, AT-13)
  // ========================================================
  const slotRes = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '35 minutes', 10, 100.00, 0, 0.00)
    RETURNING id
  `, [centerId]);
  const activeSlotId = slotRes.rows[0].id;

  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      slotId: activeSlotId,
      cropId: wheatCropId,
      estimatedQuintals: 40,
    }),
  });
  assert.equal(bookRes.status, 201);
  const bookData = await bookRes.json();
  const booking = bookData.booking;
  const qrToken = bookData.qrToken;
  assert.equal(booking.status, 'confirmed');
  assert.equal(Number(booking.price_snapshot), 2275.00);

  // ========================================================
  // STEP 4: QR Check-in at Mandi Gate Scanner (AT-08)
  // ========================================================
  const checkInRes = await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      centerId,
      qrToken,
    }),
  });
  assert.equal(checkInRes.status, 200);
  const checkInData = await checkInRes.json();
  const tokenNumber = checkInData.tokenNumber;
  assert.ok(tokenNumber >= 1);

  // Verify Idempotent check-in scan safety (AT-08)
  const dupScanRes = await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      centerId,
      qrToken,
    }),
  });
  assert.equal(dupScanRes.status, 200);
  assert.equal((await dupScanRes.json()).isRepeat, true);

  // ========================================================
  // STEP 5: Live Queue Calling (AT-09)
  // ========================================================
  const callRes = await fetch(`${baseUrl}/api/queue/center/${centerId}/call-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opToken}` },
  });
  assert.equal(callRes.status, 200);
  const callData = await callRes.json();
  assert.ok(callData.calledEntry);

  // ========================================================
  // STEP 6: Crop Weighing, Grading & Digital Receipt (AT-14)
  // Gross: 41.50q, Tare: 1.50q -> Net: 40.00q
  // Deductions: ₹100.00
  // Gross Payable: 40.00 * 2275.00 = 91000.00
  // Net Payable: 91000.00 - 100.00 = 90900.00
  // ========================================================
  const intakeRes = await fetch(`${baseUrl}/api/procurement/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      bookingId: booking.id,
      grossWeight: 41.50,
      tareWeight: 1.50,
      qualityGrade: 'Grade A',
      acceptedQuantity: 40.00,
      deductionAmount: 100.00,
      outcome: 'accepted',
      notes: 'Passed E2E simulation inspection',
    }),
  });
  assert.equal(intakeRes.status, 201);
  const intakeData = await intakeRes.json();
  const { procurementRecord, receipt, payment } = intakeData;

  assert.equal(Number(procurementRecord.net_weight), 40.00);
  assert.equal(Number(procurementRecord.payable_amount), 90900.00);
  assert.ok(receipt.receipt_number.startsWith('RCP-'));
  assert.equal(payment.payment_status, 'pending');

  // ========================================================
  // STEP 7: Payment Lifecycle & Direct Bank Transfer (AT-15)
  // ========================================================
  // Transition: pending -> processing
  const procRes = await fetch(`${baseUrl}/api/payments/${payment.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      status: 'processing',
      referenceId: 'NEFT-E2E-BATCH-001',
    }),
  });
  assert.equal(procRes.status, 200);

  // Transition: processing -> paid
  const paidRes = await fetch(`${baseUrl}/api/payments/${payment.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      status: 'paid',
      referenceId: 'UTR-SBIN-E2E-SETTLED',
      notes: 'Direct Beneficiary Transfer Settled to Farmer Account',
    }),
  });
  assert.equal(paidRes.status, 200);
  assert.equal((await paidRes.json()).payment.payment_status, 'paid');

  // ========================================================
  // STEP 8: Farmer Receipt & Ledger Verification
  // ========================================================
  const myReceiptsRes = await fetch(`${baseUrl}/api/procurement/receipts/my`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(myReceiptsRes.status, 200);
  const myReceipts = await myReceiptsRes.json();
  assert.equal(myReceipts.receipts[0].receipt_number, receipt.receipt_number);
  assert.equal(Number(myReceipts.receipts[0].payable_amount), 90900.00);

  const myPaymentsRes = await fetch(`${baseUrl}/api/payments/my/list`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(myPaymentsRes.status, 200);
  const myPayments = await myPaymentsRes.json();
  assert.equal(myPayments.payments[0].payment_status, 'paid');
  assert.equal(Number(myPayments.payments[0].amount), 90900.00);
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});
