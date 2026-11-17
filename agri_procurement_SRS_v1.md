# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

**Project:** Smart Agricultural Procurement & Queue Management System  
**Version:** 1.0 — Finalized requirements baseline  
**Date:** 17 November 2026  
**Project category:** College full-stack web application  
**Implementation status:** Planning only; no application code authorized  
**Deployment objective:** Local development and a publicly accessible zero-cost demonstration

---

## 1. Introduction

### 1.1 Problem statement
Farmers may experience long queues at agricultural procurement centers, poor visibility into procurement schedules, and uncertainty about appointment, crop acceptance, and payment status. Government and private centers may publish different procurement prices, schedules, and capacity. Farmers need a consistent way to identify suitable centers and reserve visits without waiting for manual approval.

### 1.2 Objective
Build a bilingual, mobile-friendly web application that enables farmers to compare verified procurement centers, automatically reserve capacity-controlled slots, obtain QR tokens, join a live queue after check-in, and track procurement and payment. Operators perform only necessary physical and exceptional tasks; the platform automates routine decisions. The project is educational and will use synthetic test data rather than representing an official government procurement integration.

### 1.3 Scope
The application supports government and private centers, farmer/center-operator/platform-admin roles, one-time center verification, crop-specific published pricing, eligibility-filtered recommendations, atomic bookings, live queues, no-shows, rescheduling, emergency closure handling, notifications, crop verification, receipt generation, payment-status tracking, bilingual UI, analytics, and a separately isolated demo simulation.

### 1.4 Explicit exclusions
No actual bank transfer, payment gateway, government procurement API, Aadhaar/KYC verification, legally binding MSP validation, live mandi price feed, automatic physical quality grading, SMS gateway, AI/ML price prediction, or guaranteed 24/7 production availability. All government-center names, rates, and eligibility rules used in the demonstration are fictional/configured test values and not official representations.

## 2. Stakeholders and roles

| Role | Permissions and responsibilities |
|---|---|
| Farmer | Register/login, maintain profile and language, specify crop/quantity/location, compare centers, book/cancel/rebook, view QR and queue, see receipts/payment statuses/notifications. |
| Center operator | Request onboarding, manage verified assigned centers, configure schedules/prices/capacity, scan/check in farmers, record service completion, weigh/inspect crops, document procurement, record payment events, pause/close center. |
| Platform administrator | Verify/reject/suspend centers, oversee users and center assignments, configure reference crop information and platform rules, review audit trail, monitor analytics, handle exceptions. |
| Scheduler / backend automation | Expire holds, reconcile no-shows and reminders, release capacity, dispatch notifications, and enforce state transitions; no human approval for routine bookings. |

**Access rule:** An operator may access only centers to which they are assigned. A farmer may access only their own data. A center cannot appear in farmer searches until approved and active. Admin verification is one-time for onboarding, but subsequent suspension/reverification can be initiated for justified exceptions.

## 3. Confirmed design and platform decisions

| Area | Decision |
|---|---|
| UI/UX | Modern AgriTech theme; responsive/mobile-first; English and Hindi with persistent preference. |
| Frontend | React.js, Vite, Tailwind CSS, React Router. |
| Backend | Node.js, Express.js (JavaScript modules); REST endpoints, server-side validation and transactions. |
| Database | PostgreSQL, SQL migrations, parameterized queries, separate dev/demo/production configurations. |
| Authentication | Email/password; password hashing; role-based authorization; securely managed sessions. Mobile recorded for optional future contact, not mandatory SMS verification. |
| Realtime | Socket.IO/WebSockets for live events; refresh/resync from REST and PostgreSQL after reconnection. |
| Scheduling | Idempotent, authenticated scheduled HTTP job handler; external cron service; persistent job records. |
| Free hosting targets | Cloudflare Pages (frontend), Render free web service (API and Socket.IO), Neon free PostgreSQL, cron-job.org scheduler. |
| Notifications | In-app events guaranteed when database available; email through a verified provider account if permitted, with recorded failures and retry/fallback. |
| Deployment | Working local setup plus public demo URLs; no purchased custom domain. |

**Hosting qualification:** Render free web services may sleep after inactivity and require cold startup. A WebSocket may disconnect and timed jobs may run late. This implementation is a best-effort college demonstrator, not a high-availability agricultural service. An external scheduler should be used for actual due-work processing rather than in-process timers alone; it must not be configured merely to evade platform sleep policies. Free provider limits can change.

## 4. Functional requirements

### FR-01 — Identity, profiles, language
1. Provide distinct farmer, operator and admin role flows with one login mechanism.
2. Farmer profile: name, email, mobile contact, state, district, village, PIN, optional selected search coordinates, language preference.
3. Passwords are never stored in plaintext. Apply input validation, session expiration, rate limiting and ownership checks.
4. A mobile number is not proof of identity in this college system; no real OTP or sensitive government ID is collected.
5. English/Hindi labels, validation errors, status messages, notifications, and key transactional views are translated; preserve the chosen language.

### FR-02 — Center onboarding and governance
1. Operators submit center details: name, type (government/private), contact, address and coordinates, crop support, schedule, capacity and prices.
2. Center starts `pending_verification`; admin can approve, reject with reason, or suspend with reason.
3. Only `approved` + `active` centers receive bookings. Booking transactions recheck the center state.
4. Authorized operators can change future schedules, capacity and advertised prices. Editing must not silently invalidate existing bookings or rewrite agreed/snapshotted historical price data.
5. Government-center prices are admin-configurable/reference prices; private-center offers are operator-managed. The UI must clearly label prices as published/indicative and not imply live government certification.

### FR-03 — Crops, pricing, discovery and location
1. Support master crop catalog: wheat, rice, maize, mustard and gram, with bilingual names.
2. Each center has accepted-crop mapping, price per quintal, effective-date information, and optional crop-specific requirements.
3. Farmer inputs one crop and positive estimated quantity per booking.
4. Farmer location entry can be manual (state/district/village/PIN) or optional device geolocation with consent and editable search origin.
5. Store center coordinates. Where a farmer has location coordinates, calculate approximate straight-line distance. If no reliable coordinates are available, omit numeric distances or indicate broad district proximity; do not invent road distances.
6. Display center type, accepted crop, indicative price, estimated earnings, approximate distance, earliest available slot and center status.

### FR-04 — Smart balanced recommendations
1. Filter candidates to verified/active centers that accept the crop, satisfy applicable configured eligibility, and have a bookable slot accommodating the requested quantity and farmer count.
2. Rank eligible centers using normalized, documented factors: **40% published price, 30% proximity, 20% earliest slot, 10% estimated waiting time**.
3. Handle missing distance or wait data by displaying `Not available` and renormalizing remaining factors; do not misrepresent missing data as zero distance/wait.
4. Clearly explain recommendation reasons and allow sorting by price, proximity or soonest appointment. This is a deterministic rules-based model, not machine learning.
5. Published prices are illustrative until validated by actual quality/quantity and the center's applicable rules.

### FR-05 — Slots, booking and combined smart capacity
1. Default slot length is **30 minutes**, configurable by center. Typical demo slot limits are **10 farmers and 100 quintals**, configured per center and/or slot rather than globally assumed.
2. One booking has one farmer, one crop, one center, one slot, and one estimated crop quantity in quintals; one farmer may have many non-overlapping bookings.
3. Confirm immediately when verification, crop eligibility, farmer overlap, schedule and both capacity limits pass. **No per-booking staff approval.**
4. In a single database transaction, lock/reserve the target slot, check active farmer count and booked quantity, insert booking, and update reservation counters or equivalent aggregate locking. Concurrent last-slot attempts must not overbook.
5. Use idempotency keys to avoid duplicates from repeated clicks/retries. Cancellations/releases and rescheduling are transactional and auditable.
6. Snapshot published booking price, quantity, booking time, and terms at confirmation. Current prices may later change without changing the historical snapshot.
7. Check conflict on all active bookings for a farmer, including across centers. Avoid changing booked capacity below existing reservations without an explicit closure/reaccommodation workflow.
8. Generate unique booking reference and QR token containing an opaque signed or random identifier, not sensitive farmer details.

### FR-06 — Check-in and smart queue
1. Booking QR may be checked by an authorized operator; the operator confirms the actual farmer's arrival and system validates center, date, and token state.
2. Default check-in opens **15 minutes before slot start** and closes **15 minutes after slot start**; defaults are configurable. No-show cutoff is slot start + 15 minutes, unless center paused/closed or another exception applies.
3. Check-in is idempotent; duplicate QR scans do not create duplicate entries.
4. Eligible, checked-in farmers are ordered by **scheduled slot start first**, then **actual check-in timestamp** within the slot. Farmers not checked in are skipped.
5. Active queue shows token, status, approximate position and waiting-time estimate, clearly marked as estimates. The operator records service start/completion; the next eligible token is then called automatically.
6. Broadcast queue state changes via Socket.IO; clients must recover accurate queue state from the API after reconnect or refresh. Do not treat in-memory WebSocket state as the source of truth.

### FR-07 — Grace, no-show, cancellation, waiting list and rescheduling
1. If the farmer has not checked in by the effective cutoff, mark `no_show` via on-demand validation and/or background sweep. Persist the terminal event and release only capacity that can still be reused; never offer past time slots.
2. For a no-show/cancellation/closure, suggest eligible future alternatives. **Do not silently reassign the farmer; the farmer explicitly confirms** a replacement slot.
3. Waitlisted farmers may receive offers when a future slot becomes available. Use a short atomic **10-minute hold** on a proposed slot for an eligible recipient; expired holds release capacity. The confirmation is still farmer-initiated.
4. A farmer cannot cancel or reschedule after their procurement reaches an immutable completed outcome; exceptional corrections use recorded operator/admin action.
5. Store prior booking history and reason codes for cancellation, no-show, and rescheduling.
6. Background sweeps are best-effort and may lag on free hosting; every booking/check-in API rechecks the relevant server-time rule at use time.

### FR-08 — Center schedules, pauses and emergency closure
1. Operators configure working days/hours, holidays, slot lengths and future capacity.
2. A temporary pause suspends queue calling and extends affected deadlines appropriately; do not classify farmers as no-show solely during an officially paused period.
3. Closing a center for a date/time range blocks new bookings, marks impacted bookings `rescheduling_required`, records incident details, and notifies affected farmers.
4. Offer replacement appointments at the same or another eligible center, subject to fresh capacity and price presentation. Farmer confirms the choice.
5. Price snapshots are retained for audit, while any new center/price requires explicit display and acknowledgement before confirming the replacement.

### FR-09 — Crop inspection and procurement
1. On service, an operator records actual gross/accepted weight, crop quality/grade, final accepted quantity, final agreed rate per quintal and clearly identified deductions/adjustments.
2. Procurement can be accepted, partially accepted or rejected, with reason and operator timestamp.
3. A rejected crop has no payable purchase amount. For accepted crop, use exact decimal arithmetic: `payable = accepted_quintals × confirmed_rate_per_quintal − allowed_deductions` (floor at zero).
4. The system generates a digital receipt with booking, farmer, center, crop, weights, rate, deductions, total, status and timestamps. Receipt must remain accessible and a corrected version must be audit-traceable.
5. A procurement record is not the same as proof of payment; show these as separate statuses.

### FR-10 — Payment status (tracking only)
1. Support `pending`, `processing`, `paid`, `failed` or equivalent auditably defined payment states.
2. Only an authorized, verified payment event may move a record to `paid`; no payment is transferred by the platform.
3. Persist status history, date/time, actor, and optionally a safe reference identifier. A simulated payment event exists only in isolated demo mode.
4. Farmer dashboard and receipt display the currently recorded payment state; issue in-app and attempted email alerts for changes.

### FR-11 — Notifications
1. Persist booking confirmation, appointment reminder, queue-call, no-show, reschedule, closure, procurement and payment notifications in the database.
2. Support read/unread state, bilingual message templates, timestamps and navigation to the related item.
3. Use asynchronous email outbox: accepted event -> queued email -> attempted delivery -> sent/failed/retry, with idempotent job keys.
4. Provider: Brevo HTTP API is preferred if the account is approved for transactional email. Without a custom domain, a provider may substitute an authenticated sender; account approval and delivery are **not guaranteed**. If unavailable, in-app notifications remain fully functional and email failures are visible to admin/demo logs.
5. Separate demo and normal notification configuration; demo must never email real recipients inadvertently.

### FR-12 — Dashboards and reports
1. **Public:** Home, About, How It Works, Find Centers, Login, Register.
2. **Farmer:** Overview, My Crops/Requests, Compare Centers, Book Slot, My Bookings and QR, Live Queue, Procurement History, Receipts/Payments, Notifications, Profile.
3. **Operator:** Center Profile, Prices, Capacity/Schedules, Bookings Calendar, QR Check-in, Active Queue, Crop Verification, Payments, Closures, Reports.
4. **Admin:** Center Verification, User/Operator Overview, Centers, Analytics, Exceptions, Audit and Settings.
5. Show charts for booking volume, attendance/no-show rate, average queue time, accepted quantities and payment status; never imply demo data is real.

### FR-13 — Isolated demo simulation
1. Isolated demo has separate database credentials/data and separate email configuration. Do not mutate normal/production records.
2. Seed 3 fictional government + 3 fictional private centers around Lucknow; 20 farmer profiles; 6 center operators; 1 admin; five crops; at least 50 bookings across meaningful statuses.
3. Demo controls may advance **virtual time**, check in a sample farmer, progress queue, trigger a no-show, open/close a center, retry an email task, and record a mock payment event.
4. Demo scenarios are resettable and conspicuously labelled `DEMO / SYNTHETIC DATA`.
5. Simulated time cannot override real system time or be activated from normal/production operator routes.

## 5. Data model — logical entities

| Entity/table | Important fields and purpose |
|---|---|
| users | id, email, password_hash, role, created_at, disabled_at |
| farmer_profiles | user_id, name, mobile, location fields, language |
| centers | id, name, type, address, lat/lon, verification_status, active_state |
| center_operator_assignments | operator_user_id, center_id, role |
| center_verifications | center_id, requester, reviewer, decision, reason, timestamp |
| crops | id, names_en/hi, unit |
| center_crops | center_id, crop_id, accepts, requirements |
| center_crop_prices | center_id, crop_id, rate, effective_from/to, updated_by |
| center_schedules / closures | hours, exception dates, temporary pauses/closure windows |
| slots | id, center_id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals |
| bookings | id, farmer_id, slot_id, crop_id, estimated_quintals, price_snapshot, status, qr_token_hash, created_at |
| booking_events | booking_id, previous/new status, actor, reason, occurred_at |
| waitlist / slot_holds | farmer, crop, quantity, offered slot, hold expiry, status |
| queue_entries | booking_id, checked_in_at, called_at, served_at, queue_status |
| procurement_records | booking_id, weights, accepted quantity, quality, final price, deductions, outcome, operator |
| receipts | procurement_record_id, receipt_no, version, content snapshot |
| payments / payment_events | procurement_record_id, amount, status, external reference when available, actor, timestamps |
| notifications / email_jobs | user_id, event_key, channel, locale, read_state, delivery_state, retries |
| audit_logs | actor, entity, action, before/after summary, timestamp |
| demo_scenarios | scenario_name, virtual_time_state, seed/reset metadata; demo only |

Enforce foreign keys, uniqueness where applicable, `NUMERIC` (not floats) for money and quantities, non-negative capacities, unique check-in per booking, and indexes on center/slot, farmer/booking and notification job due time. Booking slots use a consistent timezone; store timestamps in UTC and display Asia/Kolkata for the college demo.

## 6. State transitions (normative)

| Workflow | Normal transitions | Alternative transitions |
|---|---|---|
| Center | pending_verification -> approved -> active | rejected, suspended, temporarily_closed |
| Booking | confirmed -> checked_in -> in_service -> completed | cancelled, no_show, rescheduling_required |
| Queue | not_checked_in -> waiting -> called -> serving -> done | skipped/paused with reason |
| Procurement | awaiting_inspection -> accepted / partially_accepted | rejected with reason |
| Payment | pending -> processing -> paid | failed -> processing after recorded retry |
| Email | queued -> sending -> sent | failed -> queued on retry |
| Waitlist | waiting -> offered -> held -> accepted | expired or withdrawn |

Each transition is validated server-side; record actor/source and timestamp. A completed booking/paid event is not silently reversed; authorized corrections are new audit events.

## 7. Non-functional requirements

- **Usability:** Mobile-first layouts; readable typography, keyboard navigation, high-contrast controls, understandable Hindi translations, clear success/error states.
- **Security:** HTTPS for hosted site, secure hashed passwords, CSRF/CORS considerations for sessions, role/ownership authorization, input validation, SQL parameterization, security headers, rate limiting, least-privilege database credentials, no secrets in client bundle or Git.
- **Consistency:** PostgreSQL is authoritative; booking/reschedule/cancel and holds run transactionally; repeated jobs and API retries are idempotent.
- **Realtime resilience:** Socket.IO updates are advisory; after reconnect retrieve state from server. Avoid reliance on long-lived process memory.
- **Scheduling resilience:** Time-driven work persists in database and can be safely retried. If Render sleeps, enforcement occurs when requests arrive; background cleanup is eventual.
- **Observability:** Structured server logs, job delivery history, audit records, admin error visibility; protect personally identifiable information in logs.
- **Performance target:** Under representative small seeded load, target warm API response below 2 seconds for ordinary queries. This excludes free-host cold starts and is a test objective, not a contractual guarantee.
- **Privacy:** Collect only the information needed for the college app; optional GPS permission, no mandatory Aadhaar/bank account fields; isolate synthetic demo records.
- **Compatibility:** Recent desktop and mobile browsers; responsive at approximately 360px mobile width and wider.
- **Cost:** No paid subscription, purchased domain, live payment service or paid mapping API required. Provider quotas and policies must be reviewed before deployment.

## 8. Free deployment and environment model

**Local:** React Vite dev server, local Express API, local PostgreSQL, local mock email service or console outbox. Local seed/reset commands restricted to development.

**Normal/public:** Cloudflare Pages React static build; Render free Express+Socket.IO API; Neon free PostgreSQL; cron-job.org HTTPS scheduled POST requests to authenticated idempotent worker endpoint; Brevo transactional HTTPS API if eligible. Use HTTPS and strict allowed-origin configuration; protect scheduler credentials. Free provider URLs are sufficient; no custom domain required. Live email sending is conditional on service approval, and free-tier uptime is not guaranteed.

**Demo simulation:** Separate Neon project or separately provisioned database with separate credentials, isolated virtual-time worker and blocked real-email delivery; can be demonstrated locally even when public services are unavailable. The demo UI must clearly indicate synthetic data.

Reference provider documentation (availability and limits may change):  
- Render free services: https://render.com/docs/free  
- Render WebSockets: https://render.com/docs/websocket  
- Cloudflare Pages React: https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/  
- Neon pricing: https://neon.com/blog/neon-free-plan-1-gb-per-project  
- cron-job.org: https://cron-job.org/en/  
- Brevo sender rules: https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders  
- Google Antigravity project documentation: https://antigravity.google/docs/projects

## 9. Acceptance criteria / verification checklist

| Test ID | Scenario | Expected result |
|---|---|---|
| AT-01 | Farmer registers and logs in | Valid credentials work; other farmers' data inaccessible. |
| AT-02 | Pending center is searched | Not bookable until admin-approved and active. |
| AT-03 | Compare same crop across gov/private centers | Published price, approximate distance and availability shown with type labels. |
| AT-04 | Two concurrent bookings hit last available farmer count | No overbooking; only permitted capacity reserved. |
| AT-05 | Combined quantity cap exceeded though farmer count available | Booking rejected with alternative slot suggestions. |
| AT-06 | Farmer has overlapping appointments | Second active booking blocked. |
| AT-07 | Cancel confirmed booking | Capacity released exactly once; history retained. |
| AT-08 | QR code scanned twice | Exactly one queue check-in; invalid/replayed token rejected. |
| AT-09 | Multiple arrivals in same slot | Ordered by check-in timestamp; earlier slot groups take priority. |
| AT-10 | Farmer misses effective cutoff | No-show (if not paused/closed) with valid rebooking options. |
| AT-11 | Waitlisted farmer accepts valid hold | One confirmed booking; hold expires safely if unused. |
| AT-12 | Operator pauses/closes center | New booking blocked, affected users notified; no incorrect no-shows. |
| AT-13 | Price changes after booking | Original price snapshot retained; final settlement traceable. |
| AT-14 | Operator records weight and quality | Accepted amount and receipt calculated with exact decimals. |
| AT-15 | Payment calculation completes | State remains pending until authorized payment event. |
| AT-16 | Email API unavailable | In-app notification saved; email failure/retry logged. |
| AT-17 | Socket connection drops/restarts | UI reconnects and resynchronizes correct queue. |
| AT-18 | Operator accesses another center | Request denied on backend. |
| AT-19 | Switch language | Core farmer flow, statuses and notifications use chosen language. |
| AT-20 | Demo virtual time changes | Normal database and real emails unaffected. |

## 10. Implementation phases and release gates

| Phase | Deliverable | Minimum gate before next phase |
|---|---|---|
| 0 | Repository/SRS review and architecture plan only | Clear repo layout, migrations, data flow, and acceptance plan approved. |
| 1 | React/Express/PostgreSQL foundations, identity and role access | Local startup; migrations/seeds; auth/RBAC tests. |
| 2 | Center onboarding, verification, crop catalog, schedules and prices | Unverified center cannot book; owner-only edits. |
| 3 | Farmer center discovery, location, comparison, recommendation UI | Filters and scoring reproducible; missing location handled. |
| 4 | Atomic booking, capacity, conflict handling, QR and cancellation | Concurrency test, one-crop constraint, duplicate request test pass. |
| 5 | Check-in, queue, live events, late arrivals, waiting list, rescheduling | Duplicate scan and no-show/hold/reconnect tests pass. |
| 6 | Physical verification, procurement receipt, payment tracking | Decimal tests, rejection flow, authorized payment audit pass. |
| 7 | In-app/email outbox, center pauses/closures, bilingual coverage and analytics | Notification fallback; closure and i18n tests pass. |
| 8 | Isolated demo simulator, end-to-end test suite, local/public deployment docs | All acceptance tests pass; demo isolation confirmed; public demo documented. |

At every phase: implement only that phase, run applicable tests, provide a short verification report, and obtain explicit user go-ahead before moving to the next. Antigravity may propose changes but must not silently alter confirmed requirements.

## 11. Risks, assumptions and mitigations

| Risk / assumption | Mitigation |
|---|---|
| Free backend sleeps; cron or WebSocket delayed | Persistent database, reconnect/resync, idempotent external scheduling, local backup; clear demo caveats. |
| No custom domain for branded email | Attempt approved provider's HTTP API; allow provider-compliant sender; fully functional in-app fallback. |
| Approximate location data | Label distances approximate; optional GPS; no fake road-distance claims. |
| Government pricing/eligibility rules differ | Use configured fictional values; never claim official/verified market integration. |
| Low test fidelity | Multiple centers/crops/statuses and automated acceptance scenarios. |
| Scope complexity | Incremental phases and strict phase gates, no all-at-once generation. |
| Public demo privacy | Synthetic accounts/data; no sensitive farmer documents or financial account information. |

## 12. Final scope sign-off

The user selected a **complete system developed in phases**. All major feature decisions above are confirmed. The numeric parameters (slot duration, check-in window, recommendation weights, demo capacities, hold length, scheduler interval) are finalized **implementation defaults** but are configurable and may be revised through a documented change request. No implementation activity is authorized by this SRS alone; coding begins only after the user's explicit instruction.

**SRS status:** Ready for use as the project's implementation baseline and for review in Antigravity planning-only mode.
