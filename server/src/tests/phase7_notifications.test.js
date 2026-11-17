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

  // Operator 1 Login (Assigned to Center 1 - Lucknow Central)
  const op1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.lucknow@agriprocure.local', password: 'Operator@12345' }),
  });
  op1Token = (await op1Res.json()).token;

  // Operator 2 Login (Assigned to Center 2 - Kisan Agro)
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

  const c1 = await query("SELECT id FROM centers WHERE name = 'Lucknow Central Krishi Mandi Samiti'");
  center1Id = c1.rows[0].id;

  const cr = await query("SELECT id FROM crops WHERE code = 'wheat'");
  wheatCropId = cr.rows[0].id;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

let bookingId;
let slotId;
let plainQrToken;
const targetDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10);

test('Phase 7 Helper: Create active booking for emergency testing', async () => {
  const slotsRes = await fetch(`${baseUrl}/api/slots/center/${center1Id}?date=${targetDate}`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  const slotsData = await slotsRes.json();
  slotId = slotsData.slots[0].id;

  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      slotId,
      cropId: wheatCropId,
      estimatedQuintals: 30,
    }),
  });

  const bookData = await bookRes.json();
  assert.equal(bookRes.status, 201);
  bookingId = bookData.booking.id;
  plainQrToken = bookData.qrToken;
});

test('Phase 7 - Center Operational Pause & Resume Controls', async () => {
  // 1. Operator 1 pauses Center 1
  const pauseRes = await fetch(`${baseUrl}/api/centers/${center1Id}/pause`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({ reason: 'Temporary power cut and generator maintenance' }),
  });
  assert.equal(pauseRes.status, 200);
  const pauseData = await pauseRes.json();
  assert.equal(pauseData.center.active_state, 'paused');

  // 2. Check-in during pause must be rejected (409)
  const checkInRes = await fetch(`${baseUrl}/api/queue/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      centerId: center1Id,
      qrToken: plainQrToken,
    }),
  });
  assert.equal(checkInRes.status, 409);
  const checkInData = await checkInRes.json();
  assert.equal(checkInData.code, 'CENTER_PAUSED');

  // 3. Resume center
  const resumeRes = await fetch(`${baseUrl}/api/centers/${center1Id}/resume`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${op1Token}` },
  });
  assert.equal(resumeRes.status, 200);
  const resumeData = await resumeRes.json();
  assert.equal(resumeData.center.active_state, 'active');
});

test('Phase 7 - Emergency Center Closure & Protected Rescheduling (AT-12)', async () => {
  // Prior to closure, slot reserved counts:
  const slotBefore = await query('SELECT reserved_farmers, reserved_quintals FROM slots WHERE id = $1', [slotId]);
  const farmersBefore = slotBefore.rows[0].reserved_farmers;
  const quintalsBefore = Number(slotBefore.rows[0].reserved_quintals);

  // Operator declares emergency closure due to flash floods
  const closeRes = await fetch(`${baseUrl}/api/centers/${center1Id}/emergency-close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      reason: 'Flash flooding and structural damage to mandi weighbridge',
      targetDate,
    }),
  });

  assert.equal(closeRes.status, 200);
  const closeData = await closeRes.json();
  assert.equal(closeData.center.active_state, 'closed');
  assert.ok(closeData.affectedCount >= 1);
  assert.ok(closeData.affectedBookingIds.includes(bookingId));

  // Critical Check (AT-12): Booking must be 'rescheduling_required', NOT 'no_show'!
  const bCheck = await query('SELECT status, cancellation_reason FROM bookings WHERE id = $1', [bookingId]);
  assert.equal(bCheck.rows[0].status, 'rescheduling_required');
  assert.ok(bCheck.rows[0].cancellation_reason.includes('Flash flooding'));

  // Slot capacity must be safely released
  const slotAfter = await query('SELECT reserved_farmers, reserved_quintals FROM slots WHERE id = $1', [slotId]);
  assert.equal(slotAfter.rows[0].reserved_farmers, farmersBefore - 1);
  assert.equal(Number(slotAfter.rows[0].reserved_quintals), quintalsBefore - 30);
});

test('Phase 7 - In-App Notifications & Unread Status Tracking', async () => {
  // Farmer fetches notifications
  const notifRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(notifRes.status, 200);
  const notifData = await notifRes.json();
  assert.ok(notifData.notifications.length > 0);
  assert.ok(notifData.unreadCount > 0);

  const emergencyNotif = notifData.notifications.find((n) => n.event_type === 'emergency_closure');
  assert.ok(emergencyNotif);
  assert.ok(emergencyNotif.title_en.includes('Emergency Closure'));
  assert.ok(emergencyNotif.title_hi.includes('आपातकालीन'));

  // Mark single notification as read
  const readRes = await fetch(`${baseUrl}/api/notifications/${emergencyNotif.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(readRes.status, 200);
  const readData = await readRes.json();
  assert.equal(readData.notification.is_read, true);

  // Mark all as read
  const allReadRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(allReadRes.status, 200);

  // Verify unread count is now 0
  const checkRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  const checkData = await checkRes.json();
  assert.equal(checkData.unreadCount, 0);
});

test('Phase 7 - Asynchronous Email Outbox Dispatch Worker', async () => {
  // Trigger email background worker
  const workerRes = await fetch(`${baseUrl}/api/notifications/process-email-jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(workerRes.status, 200);
  const workerData = await workerRes.json();
  assert.ok(workerData.processedCount >= 1);

  // Check email_jobs table: jobs should now be 'sent'
  const jobs = await query("SELECT * FROM email_jobs WHERE template_key = 'emergency_closure_reschedule'");
  assert.ok(jobs.rows.length > 0);
  assert.equal(jobs.rows[0].delivery_status, 'sent');
  assert.ok(jobs.rows[0].sent_at !== null);
});

test('Phase 7 - Center & System Analytics Intelligence Endpoints', async () => {
  // 1. Center Analytics
  const centerAnalyticsRes = await fetch(`${baseUrl}/api/centers/${center1Id}/analytics`, {
    headers: { Authorization: `Bearer ${op1Token}` },
  });
  assert.equal(centerAnalyticsRes.status, 200);
  const centerData = await centerAnalyticsRes.json();
  assert.ok(centerData.analytics);
  assert.ok(centerData.analytics.statusCounts);
  assert.ok(typeof centerData.analytics.noShowRate === 'number');

  // 2. System-wide Admin Analytics
  const adminAnalyticsRes = await fetch(`${baseUrl}/api/centers/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminAnalyticsRes.status, 200);
  const adminData = await adminAnalyticsRes.json();
  assert.ok(adminData.analytics);
  assert.ok(adminData.analytics.totalFarmers >= 1);
  assert.ok(adminData.analytics.centers.length >= 2);
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});
