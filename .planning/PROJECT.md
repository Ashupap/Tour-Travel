# BharatYatra PWA

## What This Is

BharatYatra is an offline-capable Progressive Web Application enabling fixed-route, multi-day bus tourism across India on a no-cost EMI model (6, 9, or 12 months). Field agents collect monthly installments from customers — even without internet — and reconcile cash with regional distributors via an OTP-verified handover workflow. Customers unlock travel eligibility automatically once they pay 2–3 EMIs.

## Core Value

**An agent in a village with no internet must be able to collect an EMI, print a receipt, and sync it to the server the moment connectivity returns — zero data loss, zero duplicate entries.**

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Data Layer & Collections
- [ ] PocketBase v0.22+ as core backend with Go/SQLite WAL mode
- [ ] `users` auth collection with `role` (admin, distributor, agent), `phone`, `distributor_id` relation, `commission_percentage`, `is_active`
- [ ] `packages` collection with title, destination, duration_days, total_price, allowed_tenures (JSON), min_emis_to_travel, cover_image, itinerary, is_active
- [ ] `subscriptions` collection with booking_code, customer info, package/agent/distributor relations, tenure, EMI tracking, and travel_status (locked → eligible → scheduled → completed)
- [ ] `installments` collection with idempotency_key, payment_mode (cash/UPI), handover_status (agent_custody / distributor_confirmed), receipt_slip_id
- [ ] `cash_handovers` collection with OTP-based custody verification workflow

#### Backend Hooks & API
- [ ] pb_hooks JS hook on subscription creation: auto-generates N installments with rolling due dates
- [ ] pb_hooks JS hook on installment update to paid: recalculates paid_emis_count and upgrades travel_status to eligible when threshold met
- [ ] Idempotent sync: reject installment records where idempotency_key already exists
- [ ] POST /api/agent/batch-sync: accepts offline payment bundle, commits atomically
- [ ] GET /api/agent/sync-manifest: returns morning manifest of assigned subscribers + installments
- [ ] POST /api/handover/initiate: computes un-reconciled cash, generates 4-digit OTP, creates handover record
- [ ] POST /api/handover/verify: distributor submits OTP, transitions all linked installments to distributor_confirmed

#### Landing Page (Public)
- [ ] Hero section with Three.js (r128) 3D luxury sleeper bus canvas with scroll-driven spline animation
- [ ] Dynamic EMI calculator (package price → tenure → monthly amount)
- [ ] Package catalog grid with Vanilla-Tilt.js 3D tilt + glare effect
- [ ] "Check Booking Status" modal (no login): HTMX renders golden "Travel Eligibility Pass" + downloadable payment slips

#### Agent Dashboard (Mobile PWA)
- [ ] Daily recovery list with "Collect Rs.X" HTMX quick-action modals
- [ ] Offline sync state indicator + "Sync Data" button
- [ ] Thermal-receipt modal (printable) + WhatsApp share URL deeplink
- [ ] "Cash in Hand" card with 1-click handover initiation

#### Distributor Dashboard (Tablet/Desktop)
- [ ] Aggregated recovery metrics, daily collections, overdue warnings
- [ ] Pending handover panel with OTP input field
- [ ] Subordinate agent performance table
- [ ] distributor_daily_analytics SQLite view

#### Admin Dashboard
- [ ] Portfolio health metrics (Total Booked, Realized, Defaults, Cash in Transit)
- [ ] Post-travel default risk watchlist
- [ ] Package manager (CRUD)
- [ ] Bus manifest passenger export
- [ ] admin_portfolio_overview SQLite view

#### PWA / Offline Engine
- [ ] manifest.json configured for standalone mobile display with app icons
- [ ] sw.js with cache-first for static assets and Background Sync for /api/agent/batch-sync
- [ ] offline-store.js (Dexie.js): packages, subscriber manifests, outbox queue for offline payments

#### Security & Access Control
- [ ] Zero-trust PocketBase rules: agents scoped to their assigned subscribers only
- [ ] Agents cannot modify installments once handover_status = distributor_confirmed
- [ ] Distributors scoped strictly to their subordinate agents

### Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS/Android app | PWA with standalone display sufficient for field use |
| Real-time push notifications | Not reliable on 2G/3G; WhatsApp is the agent communication model |
| Online payment gateway | Cash+UPI only in v1; Razorpay etc. is a v2 enhancement |
| Multi-language i18n | Hindi + English in UI text sufficient for v1 |
| Seat selection / booking calendar | Admin does seat allotment manually via bus manifest export in v1 |
| Customer mobile app | Customers interact via public landing page + booking-status modal only |

## Context

- **Target users**: Field agents in rural/semi-urban India on Android devices with 2G/3G. Distributors on tablets/laptops. Customers with feature phones (QR receipt links).
- **Network reality**: Agent workflows MUST function completely offline. Sync is opportunistic (Background Sync API + Service Worker).
- **Cash-first economy**: Primary collection mode is physical cash; UPI is secondary. OTP handover is the key trust mechanism.
- **Performance budget**: Landing page < 1.5s on 4G; 3D assets <= 1.8 MB compressed.
- **Hosting**: PocketBase single binary on Ubuntu 22.04 VPS. SQLite WAL mode.
- **PRD reference**: PRD.md contains full schema, SQL views, and ASCII architecture diagrams.

## Constraints

- **Tech Stack**: PocketBase v0.22+ (Go), HTMX v2.x, Alpine.js v3.x, Three.js r128, Tailwind CSS (standalone CLI), Dexie.js, Vanilla-Tilt.js — no React/Vue/Next.js
- **Rendering**: Server-side Go html/template + HTMX for dynamic swaps (not a SPA)
- **Offline-first**: Service Worker + Dexie.js are non-negotiable for agent PWA
- **Database**: SQLite only (PocketBase embedded)
- **Security**: PocketBase collection-level rules enforce zero-trust

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PocketBase as full backend | Single binary, built-in auth, file uploads, real-time subscriptions, hooks — zero DevOps overhead for v1 | — Pending |
| Go html/template + HTMX (not React) | Eliminates JS bundle complexity; server-rendered HTML works offline via Service Worker cache | — Pending |
| Dexie.js over raw IndexedDB | Clean Promise-based API; schema versioning; best-in-class transaction support | — Pending |
| Background Sync API for offline push | Reliable even after app close; no polling needed | — Pending |
| OTP handover (not digital signature) | Matches field reality — agents hand over physical cash in person | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-21 after initialization*
