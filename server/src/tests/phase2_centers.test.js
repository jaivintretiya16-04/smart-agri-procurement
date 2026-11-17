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
let op1CenterId;
let op2CenterId;
let pendingCenterId;
let wheatCropId;

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

  // Login accounts to acquire tokens
  const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@agriprocure.local', password: 'Admin@12345' }),
  });
  adminToken = (await adminRes.json()).token;

  const op1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.lucknow@agriprocure.local', password: 'Operator@12345' }),
  });
  op1Token = (await op1Res.json()).token;

  const op2Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator.kisan@agriprocure.local', password: 'Operator@12345' }),
  });
  op2Token = (await op2Res.json()).token;

  const farmerRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer.ramesh@agriprocure.local', password: 'Farmer@12345' }),
  });
  farmerToken = (await farmerRes.json()).token;

  // Retrieve center IDs from database
  const c1 = await query("SELECT id FROM centers WHERE name = 'Lucknow Central Krishi Mandi Samiti'");
  op1CenterId = c1.rows[0].id;

  const c2 = await query("SELECT id FROM centers WHERE name = 'Kisan Agro Logistics Hub'");
  op2CenterId = c2.rows[0].id;

  const cp = await query("SELECT id FROM centers WHERE name = 'Pragati Kisan Private Procurement Center'");
  pendingCenterId = cp.rows[0].id;

  const cr = await query("SELECT id FROM crops WHERE code = 'wheat'");
  wheatCropId = cr.rows[0].id;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

test('Phase 2 - Master Crops Catalog Retrieval (FR-03)', async () => {
  const res = await fetch(`${baseUrl}/api/crops`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.crops.length >= 5);
  const codes = data.crops.map((c) => c.code);
  assert.ok(codes.includes('wheat'));
  assert.ok(codes.includes('rice'));
  assert.ok(codes.includes('maize'));
  assert.ok(codes.includes('mustard'));
  assert.ok(codes.includes('gram'));
});

test('Phase 2 - Pending Center Exclusion from Public/Farmer Search (AT-02)', async () => {
  // 1. Unauthenticated public search
  const pubRes = await fetch(`${baseUrl}/api/centers`);
  assert.equal(pubRes.status, 200);
  const pubData = await pubRes.json();
  const pubIds = pubData.centers.map((c) => c.id);
  assert.equal(pubIds.includes(pendingCenterId), false, 'Pending center must NOT be in public results');

  // 2. Farmer search
  const farmerRes = await fetch(`${baseUrl}/api/centers`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert.equal(farmerRes.status, 200);
  const farmerData = await farmerRes.json();
  const farmerIds = farmerData.centers.map((c) => c.id);
  assert.equal(farmerIds.includes(pendingCenterId), false, 'Pending center must NOT be in farmer results');

  // 3. Admin search with status filter
  const adminRes = await fetch(`${baseUrl}/api/centers?status=pending_verification`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  const adminIds = adminData.centers.map((c) => c.id);
  assert.equal(adminIds.includes(pendingCenterId), true, 'Admin must see pending centers');
});

test('Phase 2 - Operator Access Control: Unauthorized Center Editing Blocked (AT-18)', async () => {
  // Operator 1 attempts to update prices for Operator 2's center
  const res = await fetch(`${baseUrl}/api/centers/${op2CenterId}/prices`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      cropPrices: [{ cropId: wheatCropId, ratePerQuintal: 2500.00 }],
    }),
  });

  assert.equal(res.status, 403, 'Cross-operator price update must be forbidden');
  const data = await res.json();
  assert.equal(data.code, 'CENTER_ACCESS_DENIED');
});

test('Phase 2 - Authorized Operator Price Update & Historical Snapshotting (FR-02)', async () => {
  // Operator 1 updates wheat price for their assigned center
  const updateRes = await fetch(`${baseUrl}/api/centers/${op1CenterId}/prices`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${op1Token}`,
    },
    body: JSON.stringify({
      cropPrices: [{ cropId: wheatCropId, ratePerQuintal: 2450.00 }],
    }),
  });

  assert.equal(updateRes.status, 200);
  const data = await updateRes.json();
  assert.equal(data.success, true);

  // Verify in database that prior price was archived (effective_to is set)
  const priceHistory = await query(
    'SELECT rate_per_quintal, effective_to FROM center_crop_prices WHERE center_id = $1 AND crop_id = $2 ORDER BY effective_from DESC',
    [op1CenterId, wheatCropId]
  );

  assert.ok(priceHistory.rows.length >= 2, 'Price history must retain previous entries');
  assert.equal(Number(priceHistory.rows[0].rate_per_quintal), 2450.00);
  assert.equal(priceHistory.rows[0].effective_to, null, 'Latest price must be active');
  assert.ok(priceHistory.rows[1].effective_to !== null, 'Previous price must have an expiration timestamp');
});

test('Phase 2 - Admin Center Verification: Approve & Suspend Lifecycle (FR-02)', async () => {
  // 1. Admin approves the pending center
  const approveRes = await fetch(`${baseUrl}/api/centers/${pendingCenterId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      decision: 'approved',
      reason: 'Physical inspection completed and documents verified successfully.',
    }),
  });
  assert.equal(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.equal(approveData.center.verification_status, 'approved');
  assert.equal(approveData.center.active_state, 'active');

  // Now verify it appears in public center search!
  const pubRes = await fetch(`${baseUrl}/api/centers`);
  const pubData = await pubRes.json();
  const pubIds = pubData.centers.map((c) => c.id);
  assert.equal(pubIds.includes(pendingCenterId), true, 'Newly approved center must now be publicly discoverable');

  // 2. Admin suspends center due to discrepancy
  const suspendRes = await fetch(`${baseUrl}/api/centers/${pendingCenterId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      decision: 'suspended',
      reason: 'Discrepancy in weighing balance calibration reported.',
    }),
  });
  assert.equal(suspendRes.status, 200);
  const suspendData = await suspendRes.json();
  assert.equal(suspendData.center.verification_status, 'suspended');
  assert.equal(suspendData.center.active_state, 'inactive');

  // Verify suspended center is removed from public search
  const pubResAfter = await fetch(`${baseUrl}/api/centers`);
  const pubDataAfter = await pubResAfter.json();
  const pubIdsAfter = pubDataAfter.centers.map((c) => c.id);
  assert.equal(pubIdsAfter.includes(pendingCenterId), false, 'Suspended center must NOT be in public results');
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});
