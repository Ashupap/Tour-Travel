# Roadmap: BharatYatra PWA

**Project:** BharatYatra PWA — Offline-First EMI-Based Bus Tour & Micro-Collection System
**Mode:** Vertical MVP (end-to-end slice per phase)
**Granularity:** Coarse (4 phases)
**Total Requirements:** 38 v1 requirements across 4 phases

---

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | Foundation & Data | PocketBase schema, hooks, security rules, and SQLite views running locally | DAT-01 to DAT-07, HOOK-01 to HOOK-03, SEC-01 to SEC-03 | 3 |
| 2 | Agent PWA Core | Full offline-capable agent dashboard with sync, receipts, handover workflow, and all API endpoints | API-01 to API-04, PWA-01 to PWA-05, AGNT-01 to AGNT-05, SEC-04 | 5 |
| 3 | Public Landing & Distributor | 3D landing page, customer eligibility check, distributor dashboard | LAND-01 to LAND-05, DIST-01 to DIST-04 | 4 |
| 4 | Admin Dashboard & Polish | Admin portal, bus manifest export, performance tuning, production readiness | ADMN-01 to ADMN-04 | 3 |

---

### Phase 1: Foundation & Data
**Goal:** Stand up PocketBase with the complete schema (5 collections), automated hooks, security access rules, and SQLite analytics views — a working data backbone before any UI is built.
**Mode:** mvp
**Requirements:** DAT-01, DAT-02, DAT-03, DAT-04, DAT-05, DAT-06, DAT-07, HOOK-01, HOOK-02, HOOK-03, SEC-01, SEC-02, SEC-03

**Success Criteria:**
1. Running `./pocketbase serve` starts the app; admin UI at `/admin` shows all 5 collections with correct fields, relations, and select options
2. Creating a subscription record via API automatically generates the correct number of installments (e.g., 9 for 9-month tenure) with correct amounts and rolling due dates
3. Marking an installment as `paid` via API updates `paid_emis_count` on the subscription and transitions `travel_status` to `eligible` when the threshold is met
4. Attempting to read another agent's subscriber records returns a 403 Forbidden error (zero-trust rules enforced)
5. Querying the `distributor_daily_analytics` SQLite view returns correct aggregated totals

**Dependencies:** None (greenfield)

**Plans:**
1. Project scaffolding: Go module init, PocketBase binary download, directory structure, `.gitignore`
2. Collection schema: Script or migration to create all 5 PB collections with correct field types, relations, and select options
3. pb_hooks: `subscriptions` creation hook (installment generator) + `installments` update hook (travel unlock engine) + idempotency check
4. Access rules: Write PocketBase collection-level filter rules for agents, distributors, admins
5. SQL views: Create `distributor_daily_analytics` and `admin_portfolio_overview` SQLite views via PB migration

---

### Phase 2: Agent PWA Core
**Goal:** Deliver a fully functional offline-first agent PWA: morning manifest sync, offline collection recording, background sync to server, OTP cash handover flow, thermal receipts, and WhatsApp sharing.
**Mode:** mvp
**Requirements:** API-01, API-02, API-03, API-04, PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, SEC-04

**Success Criteria:**
1. Agent logs in on mobile, taps "Sync Data" → manifest (subscribers + installments) downloads into Dexie.js IndexedDB; toggling airplane mode confirms data is accessible offline
2. In offline mode, agent collects a payment → Dexie outbox entry created; toggling back online → Service Worker Background Sync fires → batch-sync API commits the record → server shows installment as `paid`
3. After collection, agent views a correctly formatted thermal receipt (booking code, amount, date) and the WhatsApp button generates a valid `wa.me/` URL with receipt summary
4. Agent taps "Handover to Distributor" → system computes cash total, generates a 4-digit OTP → distributor enters OTP → all linked installments transition to `distributor_confirmed`
5. Any batch-sync request with a duplicate `idempotency_key` is rejected with a clear error (no duplicate records created)

**Dependencies:** Phase 1 (schema, hooks, security rules)

**UI hint:** yes

**Plans:**
1. API endpoints: Implement `/api/agent/sync-manifest`, `/api/agent/batch-sync`, `/api/handover/initiate`, `/api/handover/verify` as PocketBase custom routes in Go
2. Service Worker + manifest: `manifest.json`, `sw.js` with cache-first + background sync registration
3. Dexie.js offline store: `offline-store.js` schema (packages, subscriptions, installments, outbox tables)
4. Agent dashboard template: Go html/template for `/agent/dashboard` — recovery list, collect modal (HTMX), sync state indicator
5. Receipt & handover UI: Thermal-receipt modal, WhatsApp share URL generation, "Cash in Hand" card, handover initiation HTMX flow

---

### Phase 3: Public Landing & Distributor
**Goal:** Build the public-facing 3D landing page (Three.js bus, EMI calculator, Vanilla-Tilt package cards, booking status check) and the distributor dashboard with handover approval and agent performance table.
**Mode:** mvp
**Requirements:** LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, DIST-01, DIST-02, DIST-03, DIST-04

**Success Criteria:**
1. Landing page loads in < 1.5s on simulated 4G (Chrome DevTools throttling); Three.js bus canvas renders and animates on scroll without janking the main thread
2. EMI calculator correctly computes monthly installment for any package + tenure combination; Vanilla-Tilt activates on package cards with visible glare effect
3. Customer enters a valid booking code or phone number in the "Check Booking Status" modal and sees an HTMX-rendered golden Travel Eligibility Pass with correct travel_status and payment history
4. Distributor logs in and sees correct aggregated metrics matching the distributor_daily_analytics view; delinquent accounts (>30 days overdue) appear in the warnings section
5. Distributor successfully verifies an agent handover by entering the correct OTP in the pending handovers panel

**Dependencies:** Phase 1 (schema), Phase 2 (handover API)

**UI hint:** yes

**Plans:**
1. Three.js hero canvas: Low-poly bus GLTF model, scroll-driven spline camera interpolation, performance budget enforcement (asset <= 1.8MB)
2. EMI calculator + Vanilla-Tilt cards: Alpine.js reactive EMI calculator, package catalog with tilt.js integration
3. Booking status modal: HTMX-powered public lookup endpoint, golden Travel Eligibility Pass template, payment slip download links
4. Distributor dashboard template: Go html/template for `/distributor/dashboard` — metrics cards, agent performance table, overdue warnings
5. Handover approval panel: OTP input UI, HTMX-driven verify call, status update feedback

---

### Phase 4: Admin Dashboard & Production Polish
**Goal:** Deliver the admin master portal (portfolio metrics, risk watchlist, package CRUD, bus manifest export), then harden the app for production (performance tuning, error handling, deployment guide).
**Mode:** mvp
**Requirements:** ADMN-01, ADMN-02, ADMN-03, ADMN-04

**Success Criteria:**
1. Admin dashboard shows correct portfolio metrics (Total Booked, Realized, Defaults, Float) drawn from `admin_portfolio_overview` view
2. Post-travel default risk watchlist shows customers with travel_status in (scheduled, completed) who have >= 1 overdue installment; list is accurate and sortable
3. Admin can create, edit, deactivate a package through the package manager UI; changes reflect immediately on the landing page
4. Admin can generate and download a bus manifest CSV for a specific tour containing all scheduled passengers with payment status

**Dependencies:** Phase 1-3

**UI hint:** yes

**Plans:**
1. Admin dashboard template: Go html/template for `/admin/dashboard` — portfolio metrics cards (from SQL view), risk watchlist table
2. Package manager: CRUD UI for packages (HTMX-powered create/edit/delete modal), cover image upload via PocketBase file API
3. Bus manifest export: Query scheduled passengers, render to CSV, return as file download response
4. Production hardening: Error page templates (404, 500), PocketBase rate limiting, deployment guide (systemd service, Caddy reverse proxy, SSL)

---

## Milestone: v1.0

**Target:** All 4 phases complete
**Definition of Done:**
- All 38 v1 requirements verified
- Agent can complete full offline collection → sync → handover flow end-to-end
- Public landing page live and performant
- Admin and distributor dashboards operational
- Deployed to production VPS with SSL

---
*Roadmap created: 2026-09-21*
*Last updated: 2026-09-21 after initialization*
