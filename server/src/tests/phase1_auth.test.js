import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb, closeDb } from '../config/db.js';
import { runMigrations } from '../migrations/runner.js';
import { seedAll } from '../seeds/seed_all.js';
import app from '../app.js';

let serverInstance;
let baseUrl;

test.before(async () => {
  await initDb();
  await runMigrations();
  await seedAll({ clean: true });

  // Start server on ephemeral port
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await closeDb();
});

test('Phase 1 - Health Check Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'healthy');
});

test('Phase 1 - Admin Seed Login (AT-01)', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@agriprocure.local',
      password: 'Admin@12345',
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.user.role, 'admin');
  assert.ok(data.token);
});

test('Phase 1 - Invalid Password Rejection (AT-01)', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@agriprocure.local',
      password: 'WrongPassword!',
    }),
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, true);
  assert.equal(data.code, 'INVALID_CREDENTIALS');
});

test('Phase 1 - Farmer Registration & Duplicate Rejection (AT-01)', async () => {
  const uniqueEmail = `farmer.test.${Date.now()}@agriprocure.local`;
  const registerPayload = {
    name: 'Harish Chandra',
    email: uniqueEmail,
    password: 'FarmerPassword@123',
    mobile: '9876500000',
    district: 'Lucknow',
    village: 'Kakori',
    pincode: '226101',
    preferred_language: 'hi',
  };

  // 1. First registration
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload),
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.user.role, 'farmer');
  assert.equal(data.user.name, 'Harish Chandra');
  assert.equal(data.user.preferred_language, 'hi');
  assert.ok(data.token);

  // 2. Duplicate registration attempt with same email
  const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload),
  });
  assert.equal(dupRes.status, 409);
  const dupData = await dupRes.json();
  assert.equal(dupData.code, 'EMAIL_IN_USE');
});

test('Phase 1 - Profile Retrieval, Update & Language Switching', async () => {
  // Login as seeded farmer Ramesh
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer.ramesh@agriprocure.local',
      password: 'Farmer@12345',
    }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Retrieve current user session via /api/auth/me
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user.email, 'farmer.ramesh@agriprocure.local');

  // Update profile and switch preferred language to English
  const updateRes = await fetch(`${baseUrl}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      village: 'Updated BKT Village',
      preferred_language: 'en',
    }),
  });
  assert.equal(updateRes.status, 200);
  const updateData = await updateRes.json();
  assert.equal(updateData.profile.preferred_language, 'en');
  assert.equal(updateData.profile.village, 'Updated BKT Village');
});

test('Phase 1 - Token Invalidation on Logout (AT-01)', async () => {
  // Login as Suresh
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer.suresh@agriprocure.local',
      password: 'Farmer@12345',
    }),
  });
  const { token } = await loginRes.json();

  // Verify token works
  const verifyRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(verifyRes.status, 200);

  // Call logout endpoint
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logoutRes.status, 200);

  // Verify that old token is now rejected with TOKEN_REVOKED
  const postLogoutRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(postLogoutRes.status, 401);
  const postLogoutData = await postLogoutRes.json();
  assert.equal(postLogoutData.code, 'TOKEN_REVOKED');
});
