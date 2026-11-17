# Smart Agricultural Procurement & Queue Management System
## Deployment Runbook & Hosting Architecture Guide

This document details the complete deployment configuration for hosting the **Smart Agricultural Procurement & Queue Management System** on completely free cloud tiers:
- **Frontend:** Cloudflare Pages (React + Vite + Tailwind CSS)
- **Backend:** Render.com Web Service (Node.js + Express.js + Socket.IO)
- **Database (Cloud Production):** Neon.tech Serverless PostgreSQL (PostgreSQL 16 with SSL)
- **Database (Dedicated Local Real PostgreSQL):** Native PostgreSQL 18.6 daemon (`start_db.js`, port 54329, persistent data in `.postgres_data`)
- **Local Fallback (Zero-Config Dev Only):** Self-contained in-memory PostgreSQL (`pg-mem`). Strictly prohibited in production (`NODE_ENV === 'production'`).

---

### Architecture Overview

```mermaid
flowchart TD
    Client["Cloudflare Pages<br/>(React + Vite SPA)"]
    Backend["Render.com<br/>(Node.js / Express API)"]
    NeonDB[("Neon Cloud PostgreSQL<br/>(22 Relational Tables)")]
    LocalDB[("In-Memory pg-mem<br/>(Local Zero-Config Fallback)")]

    Client -- "HTTPS REST & WebSocket" --> Backend
    Backend -- "DATABASE_URL (SSL)" --> NeonDB
    Backend -. "DATABASE_URL not set" .-> LocalDB
```

---

### 1. Database Setup (Neon PostgreSQL)

1. Sign up for free at [Neon.tech](https://neon.tech).
2. Create a new project (e.g., `agri-procure-db`) in the closest region (e.g., `ap-southeast-1` or `eu-central-1`).
3. Copy the pooled connection string with SSL:
   ```env
   DATABASE_URL="postgresql://user:password@ep-sample-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   ```
4. Run migrations and seed data against the cloud database:
   ```powershell
   cd "server"
   $env:DATABASE_URL="postgresql://user:password@ep-sample-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   node src/migrations/runner.js
   node src/seeds/seed_all.js
   ```

> [!IMPORTANT]
> **Strict Production Prohibition:** If `NODE_ENV === 'production'` and `DATABASE_URL` is omitted, the backend server throws a fatal error and refuses to start, ensuring that transient in-memory databases can never silently run in production.

---

### 2. Dedicated Local Real PostgreSQL Instance
For rigorous offline verification against native PostgreSQL without external cloud credentials:
```powershell
cd "c:\mann\SE project\server"
node start_db.js
```
- Starts native PostgreSQL 18.6 compiled by MSVC on port `54329`.
- Cluster initialized with `--encoding=UTF8 --locale=C` for complete Hindi Unicode compatibility.
- Data persists in `.postgres_data` across backend restarts.
- Auto-provisions isolated production and demo databases (`agri_procure` and `agri_procure_demo`).

---

### 2. Backend Deployment (Render.com)

1. Sign up for free at [Render.com](https://render.com).
2. Click **New +** -> **Web Service** and connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `agri-procure-api`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Set the following **Environment Variables**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `5000` | Port listened to by Express |
   | `DATABASE_URL` | `postgresql://...` | Neon PostgreSQL pooled URL |
   | `JWT_SECRET` | `(Generated 64-char string)` | Secret key for JWT signing |
   | `JWT_EXPIRES_IN` | `7d` | Session expiration window |
   | `FRONTEND_URL` | `https://agri-procure.pages.dev` | Cloudflare Pages origin for CORS |

#### Handling Render Free-Tier Sleeping
- Free Render web services spin down after 15 minutes of inactivity.
- The client-side HTTP layer (`client/src/services/api.js`) automatically intercepts 502/504 errors, surfaces an agricultural "Server waking up..." status banner, and performs graceful retries until the instance warms up (typically ~30 seconds).

---

### 3. Frontend Deployment (Cloudflare Pages)

1. Sign up for free at [Cloudflare](https://dash.cloudflare.com).
2. Go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Project Name:** `agri-procure`
   - **Framework Preset:** `Vite`
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
4. Set **Environment Variables**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://agri-procure-api.onrender.com/api` | Render backend API endpoint |
5. Click **Save and Deploy**. Cloudflare Pages will build and deploy the React bundle to its global CDN.

---

### 4. Running the Complete System Locally

To run the entire full-stack application on your local machine:

#### Step 1: Start the Backend Server
```powershell
cd "c:\mann\SE project\server"
npm start
```
*The server will start on `http://localhost:5000` and automatically initialize in-memory PostgreSQL if `DATABASE_URL` is not set.*

#### Step 2: Start the Frontend Vite Dev Server
```powershell
cd "c:\mann\SE project\client"
npm run dev
```
*The client will start on `http://localhost:5173`.*

#### Step 3: Run Master Automated Test Suites
```powershell
cd "c:\mann\SE project\server"
node src/tests/run_all_tests.js
```
*Runs all 8 test suites in isolated sub-processes and validates all 41 test assertions.*

---

### 5. Pre-Seeded Default Test Accounts

| Role | Email | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@agriprocure.local` | `Admin@12345` | Governance, center verification, analytics |
| **Center Operator 1** | `operator.lucknow@agriprocure.local` | `Operator@12345` | Assigned to Lucknow Central Mandi |
| **Center Operator 2** | `operator.kisan@agriprocure.local` | `Operator@12345` | Assigned to Kisan Agro Logistics Hub |
| **Farmer (Ramesh)** | `farmer.ramesh@agriprocure.local` | `Farmer@12345` | Pre-registered farmer in Lucknow district |
