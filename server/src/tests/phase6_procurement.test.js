import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb, query, closeDb } from '../config/db.js';
import { runMigrations } from '../migrations/runner.js';
import { seedAll } from '../seeds/seed_all.js';
import app from '../app.js';

let serverInstance;
let baseUrl;
let adminToken;
let op1Token;
let op2Token;
let farmerToken;
let center1Id;
let center2Id;
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

  // Operator 1 Login (Assigned to Lucknow Central)
  const op1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.lucknow@agriprocure.local', password: 'Operator@12345' }),
  });
  op1Token = (await op1Res.json()).token;

  // Operator 2 Login (Assigned to Kisan Agro Logistics Hub)
  const op2Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.kisan@agriprocure.local', password: 'Operator@12345' }),
  });
  op2Token = (await op2Res.json()).token;

  // Farmer Login
  const fRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer.ramesh@agriprocure.local', password: 'Farmer@12345' }),
  });
  farmerToken = (await fRes.json()).token;

  // Centers
  const c1 = await query("SELECT id FROM centers WHERE name = 'Lucknow Central Krishi Mandi Samiti'");
  center1Id = c1.rows[0].id;

  const c2 = await query("SELECT id FROM centers WHERE name = 'Kisan Agro Logistics Hub'");
  center2Id = c2.rows[0].id;

  // Crop
  const cr = await query("SELECT id FROM crops WHERE code = 'wheat'");
  wheatCropId = cr.rows[0].id;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

let bookingId;
let paymentId;
let receiptNumber;

test('Phase 6 Helper: Setup booking and slot for intake testing', async () => {
  const slotDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10);
  const slotsRes = await fetch(`${baseUrl}/api/slots/center/${center1Id}?date=${slotDate}`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  const slotsData = await slotsRes.json();
  const slotId = slotsData.slots[0].id;

  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      slotId,
      cropId: wheatCropId,
      estimatedQuintals: 50,
    }),
  });

  const bookData = await bookRes.json();
  assert.equal(bookRes.status, 201);
  bookingId = bookData.booking.id;
  assert.ok(bookingId);
});

test('Phase 6 - Exact Decimal Payment Calculation & Immutable Receipt (AT-14)', async () => {
  // AT-14 exact test values:
  // Gross: 52.40, Tare: 2.10 -> Net: 50.30, Accepted: 50.30
  // Seed price snapshot for Wheat at center 1 is ₹2275.00
  // Deduction: ₹150.00
  // Expected Gross: 50.30 * 2275.00 = 114432.50
  // Expected Net Payable: 114432.50 - 150.00 = 114282.50
  const intakeRes = await fetch(`${baseUrl}/api/procurement/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      bookingId,
      grossWeight: 52.40,
      tareWeight: 2.10,
      qualityGrade: 'Grade A',
      acceptedQuantity: 50.30,
      deductionAmount: 150.00,
      outcome: 'accepted',
      notes: 'Moisture 11.2%, acceptable quality',
    }),
  });

  assert.equal(intakeRes.status, 201);
  const resData = await intakeRes.json();
  const { procurementRecord, receipt, payment } = resData;

  // Exact decimal verification
  assert.equal(Number(procurementRecord.gross_weight), 52.40);
  assert.equal(Number(procurementRecord.tare_weight), 2.10);
  assert.equal(Number(procurementRecord.net_weight), 50.30);
  assert.equal(Number(procurementRecord.accepted_quantity), 50.30);
  assert.equal(Number(procurementRecord.final_rate_per_quintal), 2275.00);
  assert.equal(Number(procurementRecord.deduction_amount), 150.00);
  assert.equal(Number(procurementRecord.payable_amount), 114282.50);

  // Digital Receipt verification
  assert.ok(receipt.receipt_number.startsWith('RCP-'));
  receiptNumber = receipt.receipt_number;
  assert.equal(receipt.content_snapshot.financials.payableAmount, 114282.50);
  assert.equal(receipt.content_snapshot.financials.deductionAmount, 150.00);

  // Initial payment verification
  assert.equal(payment.payment_status, 'pending');
  assert.equal(Number(payment.amount), 114282.50);
  paymentId = payment.id;

  // Booking status must be completed
  const bCheck = await query('SELECT status FROM bookings WHERE id = $1', [bookingId]);
  assert.equal(bCheck.rows[0].status, 'completed');
});

test('Phase 6 - Double Intake Prevention (Idempotency & Duplicate Rejection)', async () => {
  const dupRes = await fetch(`${baseUrl}/api/procurement/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      bookingId,
      grossWeight: 50,
      tareWeight: 1,
      qualityGrade: 'Grade A',
    }),
  });

  assert.equal(dupRes.status, 409);
  const errData = await dupRes.json();
  assert.equal(errData.code, 'PROCUREMENT_ALREADY_RECORDED');
});

test('Phase 6 - Crop Rejection Workflow: Zero Payable & Mandatory Reason', async () => {
  // Register separate farmer to avoid overlapping bookings
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rejection Test Farmer',
      email: 'rej.farmer@agriprocure.test',
      mobile: '9888877799',
      password: 'Farmer@12345',
      district: 'Lucknow',
    }),
  });
  const regData = await regRes.json();
  assert.equal(regRes.status, 201, `Registration failed: ${JSON.stringify(regData)}`);
  const rejFarmerToken = regData.token;

  const slotDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10);
  const slotsRes = await fetch(`${baseUrl}/api/slots/center/${center1Id}?date=${slotDate}`, {
    headers: { Authorization: `Bearer ${rejFarmerToken}` },
  });
  const slotsData = await slotsRes.json();
  const slotId = (slotsData.slots[1] || slotsData.slots[0]).id;

  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${rejFarmerToken}`,
    },
    body: JSON.stringify({
      slotId,
      cropId: wheatCropId,
      estimatedQuintals: 20,
    }),
  });
  const bookData = await bookRes.json();
  assert.equal(bookRes.status, 201, `Booking failed: ${JSON.stringify(bookData)}`);
  const rejBookingId = bookData.booking.id;

  // 1. Rejection without reason must fail (400)
  const failRes = await fetch(`${baseUrl}/api/procurement/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      bookingId: rejBookingId,
      grossWeight: 20,
      tareWeight: 0.5,
      qualityGrade: 'Substandard',
      outcome: 'rejected',
      rejectionReason: '',
    }),
  });
  assert.equal(failRes.status, 400);

  // 2. Rejection with reason succeeds with 0 payable
  const rejRes = await fetch(`${baseUrl}/api/procurement/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      bookingId: rejBookingId,
      grossWeight: 20,
      tareWeight: 0.5,
      qualityGrade: 'Substandard',
      outcome: 'rejected',
      rejectionReason: 'Moisture exceeds 20% and fungal infestation detected.',
    }),
  });
  assert.equal(rejRes.status, 201);
  const rejData = await rejRes.json();
  assert.equal(Number(rejData.procurementRecord.accepted_quantity), 0.00);
  assert.equal(Number(rejData.procurementRecord.payable_amount), 0.00);
  assert.equal(rejData.procurementRecord.outcome, 'rejected');
  assert.equal(
    rejData.procurementRecord.rejection_reason,
    'Moisture exceeds 20% and fungal infestation detected.'
  );
});

test('Phase 6 - Payment Status Transition Authorization & Audit History (AT-15)', async () => {
  // 1. Operator 2 (assigned to Malihabad) cannot update payment for Center 1
  const unauthRes = await fetch(`${baseUrl}/api/payments/${paymentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op2Token}`,
    },
    body: JSON.stringify({
      status: 'processing',
      referenceId: 'NEFT-12345678',
    }),
  });
  assert.equal(unauthRes.status, 403);
  const unauthData = await unauthRes.json();
  assert.equal(unauthData.code, 'UNAUTHORIZED_PAYMENT_OPERATOR');

  // 2. Authorized Operator 1 transitions payment: pending -> processing
  const procRes = await fetch(`${baseUrl}/api/payments/${paymentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      status: 'processing',
      referenceId: 'NEFT-001-PENDING',
      notes: 'Dispatched to state treasury bank batch',
    }),
  });
  assert.equal(procRes.status, 200);
  const procData = await procRes.json();
  assert.equal(procData.payment.payment_status, 'processing');
  assert.equal(procData.event.from_status, 'pending');
  assert.equal(procData.event.to_status, 'processing');

  // 3. Authorized Operator transitions payment: processing -> paid
  const paidRes = await fetch(`${baseUrl}/api/payments/${paymentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      status: 'paid',
      referenceId: 'UTR-SBIN20261117-998877',
      notes: 'Direct Beneficiary Transfer confirmed by bank',
    }),
  });
  assert.equal(paidRes.status, 200);
  const paidData = await paidRes.json();
  assert.equal(paidData.payment.payment_status, 'paid');
  assert.equal(paidData.event.from_status, 'processing');
  assert.equal(paidData.event.to_status, 'paid');

  // 4. Paid is terminal: attempting to revert paid payment fails (400)
  const revertRes = await fetch(`${baseUrl}/api/payments/${paymentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      status: 'failed',
    }),
  });
  assert.equal(revertRes.status, 400);
  const revData = await revertRes.json();
  assert.equal(revData.code, 'PAYMENT_ALREADY_SETTLED');

  // 5. Verify full audit trail via GET /api/payments/:paymentId
  const historyRes = await fetch(`${baseUrl}/api/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${op1Token}` },
  });
  assert.equal(historyRes.status, 200);
  const histData = await historyRes.json();
  const events = histData.payment.events;
  assert.ok(events.length >= 3); // initial pending, processing, paid
  assert.equal(events[0].to_status, 'pending');
  assert.equal(events[1].to_status, 'processing');
  assert.equal(events[2].to_status, 'paid');
});

test('Phase 6 - Farmer Digital Receipts & Payment Tracking Endpoint Retrieval', async () => {
  // 1. Farmer gets their receipts
  const receiptsRes = await fetch(`${baseUrl}/api/procurement/receipts/my`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(receiptsRes.status, 200);
  const recData = await receiptsRes.json();
  assert.ok(recData.receipts.length > 0);
  assert.equal(recData.receipts[0].receipt_number, receiptNumber);

  // 2. Single receipt lookup
  const singleRecRes = await fetch(`${baseUrl}/api/procurement/receipts/${receiptNumber}`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(singleRecRes.status, 200);
  const sData = await singleRecRes.json();
  assert.equal(sData.receipt.receipt_number, receiptNumber);

  // 3. Farmer gets their payment records
  const paymentsRes = await fetch(`${baseUrl}/api/payments/my/list`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(paymentsRes.status, 200);
  const payData = await paymentsRes.json();
  assert.ok(payData.payments.length > 0);
  assert.equal(payData.payments[0].payment_status, 'paid');
  assert.equal(Number(payData.payments[0].amount), 114282.50);
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});
