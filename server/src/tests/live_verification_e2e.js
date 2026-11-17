import assert from 'node:assert/strict';
import { initDb, query, closeDb } from '../config/db.js';

const API = 'http://localhost:5000/api';

async function runLiveVerification() {
  console.log('🚀 Running Live System Verification against Running Servers...');
  await initDb();

  // 1. Health Check
  const healthRes = await fetch(`${API}/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  console.log('✅ 1. Health check passed:', health.status);

  // 2. Farmer Registration & Login
  const uniqueEmail = `farmer.live.${Date.now()}@agriprocure.local`;
  const regRes = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Kishan Lal Farmer',
      email: uniqueEmail,
      mobile: '9876500001',
      password: 'Farmer@12345',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      village: 'Bakshi Ka Talab',
      preferred_language: 'hi',
    }),
  });
  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  const farmerToken = regData.token;
  console.log('✅ 2. Farmer registration & authentication passed:', regData.user.name);

  // 3. Center Discovery
  const centersRes = await fetch(`${API}/centers`);
  assert.equal(centersRes.status, 200);
  const centersData = await centersRes.json();
  assert.ok(centersData.centers.length >= 5);
  console.log(`✅ 3. Center discovery passed: found ${centersData.centers.length} approved procurement centers.`);

  // Find Lucknow Central Mandi
  const lucknowCenter = centersData.centers.find(c => c.name.includes('Lucknow Central'));
  assert.ok(lucknowCenter, 'Lucknow Central Mandi must exist');

  // 4. Smart Recommendation
  const recRes = await fetch(`${API}/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      cropCode: 'wheat',
      quantityQuintals: 20.0,
      latitude: 26.9800,
      longitude: 80.9200,
    }),
  });
  assert.equal(recRes.status, 200);
  const recData = await recRes.json();
  assert.ok(recData.recommendations.length >= 2);
  const topRec = recData.recommendations[0];
  console.log(`✅ 4. Smart recommendation passed: Top center "${topRec.center_name}" (Score: ${topRec.recommendationScore}%, Distance: ${topRec.distanceKm} km, Rate: ₹${topRec.matchedCrop.price_per_quintal}/q)`);

  // 5. Atomic Slot Discovery & Booking (Create an active slot in current window for check-in testing)
  const slotRes = await query(`
    INSERT INTO slots (center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals)
    VALUES ($1, NOW() + INTERVAL '2 minutes', NOW() + INTERVAL '32 minutes', 10, 100.00, 0, 0.00)
    RETURNING *
  `, [lucknowCenter.id]);
  const targetSlot = slotRes.rows[0];

  const wheatRes = await fetch(`${API}/crops`);
  const cropsData = await wheatRes.json();
  const wheat = cropsData.crops.find(c => c.code === 'wheat');

  const bookRes = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      slotId: targetSlot.id,
      cropId: wheat.id,
      estimatedQuintals: 20.0,
    }),
  });
  const bookData = await bookRes.json();
  if (bookRes.status !== 201) {
    console.error('Book slot error:', bookData);
  }
  assert.equal(bookRes.status, 201);
  const booking = bookData.booking;
  const qrToken = bookData.qrToken;
  console.log(`✅ 5. Atomic booking passed: Ref ${booking.booking_reference}, QR Token issued.`);

  // 6. Operator Login
  const opLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'operator.lucknow@agriprocure.local',
      password: 'Operator@12345',
    }),
  });
  assert.equal(opLoginRes.status, 200);
  const opToken = (await opLoginRes.json()).token;
  console.log('✅ 6. Operator authenticated.');

  // 7. QR Check-in
  const checkInRes = await fetch(`${API}/queue/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      centerId: lucknowCenter.id,
      qrToken: qrToken,
    }),
  });
  assert.equal(checkInRes.status, 200);
  const checkInData = await checkInRes.json();
  console.log(`✅ 7. QR Check-in passed: Token #${checkInData.tokenNumber} assigned (Queue Position: ${checkInData.queuePosition}).`);

  // 8. Priority Queue Progression: Call Next Token
  const callNextRes = await fetch(`${API}/queue/center/${lucknowCenter.id}/call-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opToken}` },
  });
  assert.equal(callNextRes.status, 200);
  const callData = await callNextRes.json();
  assert.ok(callData.calledEntry);
  console.log(`✅ 8. Live queue progression passed: Called Token #${callData.calledEntry.token_number}.`);

  // 9. Crop Weighing & Quality Intake
  const intakeRes = await fetch(`${API}/procurement/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      bookingId: booking.id,
      grossWeight: 2100.00,
      tareWeight: 100.00,
      moistureContent: 11.5,
      foreignMatterPercent: 0.8,
      qualityGrade: 'Grade A',
      decision: 'accepted',
    }),
  });
  const intakeData = await intakeRes.json();
  if (intakeRes.status !== 201) {
    console.error('Intake Error:', intakeData);
  }
  assert.equal(intakeRes.status, 201);
  const receipt = intakeData.receipt;
  const payment = intakeData.payment;
  console.log(`✅ 9. Crop weighing & intake passed: 20 quintals accepted, Receipt #${receipt.receipt_number}, Net Payable: ₹${receipt.payable_amount}`);

  // 10. Payment Status Update: Processing -> Paid
  const payUpdateRes = await fetch(`${API}/payments/${payment.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opToken}`,
    },
    body: JSON.stringify({
      status: 'paid',
      referenceId: 'UTR-LIVE-TEST-2026',
      notes: 'Direct DBT payment settlement simulated.',
    }),
  });
  assert.equal(payUpdateRes.status, 200);
  console.log('✅ 10. Payment status transition passed: Status updated to PAID.');

  // 11. Farmer Receipts & Payment Ledger
  const myReceiptsRes = await fetch(`${API}/procurement/receipts/my`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(myReceiptsRes.status, 200);
  const myReceipts = await myReceiptsRes.json();
  assert.equal(myReceipts.receipts[0].receipt_number, receipt.receipt_number);
  console.log('✅ 11. Farmer digital receipt ledger verified.');

  // 12. Admin Login & Verification Overview
  const adminLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@agriprocure.local',
      password: 'Admin@12345',
    }),
  });
  assert.equal(adminLoginRes.status, 200);
  const adminToken = (await adminLoginRes.json()).token;

  const adminOverviewRes = await fetch(`${API}/centers/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminOverviewRes.status, 200);
  console.log('✅ 12. Admin dashboard analytics verified.');

  // 13. Virtual Time Controller Isolation (Demo Simulator)
  const advanceTimeRes = await fetch(`${API}/demo/time/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ minutes: 30 }),
  });
  assert.equal(advanceTimeRes.status, 200);
  console.log('✅ 13. Demo simulation virtual time controller verified.');

  console.log('\n🎉 ALL LIVE USER WORKFLOWS VERIFIED SUCCESSFULLY!');
  await closeDb();
}

runLiveVerification().catch(err => {
  console.error('❌ Live verification failed:', err);
  process.exit(1);
});
