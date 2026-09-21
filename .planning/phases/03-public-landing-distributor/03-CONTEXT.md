# Phase 03: Public Landing & Distributor — Context

**Gathered:** 2026-09-21
**Status:** Ready for planning
**Source:** PRD Express Path (`PRD.md`) + `GEMINI.md` + `REQUIREMENTS.md`

<domain>
## Phase Boundary

This phase delivers the public-facing 3D landing page and the distributor territory management portal:
- Public Landing Page (`/` or `index.html`) featuring an interactive Three.js (r128) 3D luxury sleeper bus canvas animating along a spline curve as the user scrolls (`LAND-01`).
- Dynamic client-side EMI calculator allowing travelers to select packages and tenures to calculate monthly installments (`LAND-02`).
- Package catalog grid featuring 3D cards with Vanilla-Tilt.js (`glare: true`, `maxGlare: 0.35`, `speed: 400`) (`LAND-03`).
- "Check Booking Status" modal enabling customers to enter phone number or booking code and receive an HTMX-rendered golden Travel Eligibility Pass (`LAND-04`).
- Downloadable payment history and receipt slips breakdown on the eligibility pass (`LAND-05`).
- Distributor Dashboard (`/distributor/dashboard`) displaying territory recovery metrics from `distributor_daily_analytics` (`DIST-01`).
- Subordinate agent performance roster with collections today, field float in custody, and overdue accounts (`DIST-03`).
- Delinquent account warnings section highlighting accounts with installments overdue > 30 days (`DIST-04`).
- Pending handovers panel with 4-digit OTP input for verifying agent cash handovers (`DIST-02`).
</domain>

<decisions>
## Implementation Decisions

### 1. Three.js Hero 3D Bus Experience (LAND-01)
- **Asset / Rendering Strategy:** Self-contained procedural Three.js r128 luxury double-axle Bharat sleeper coach with golden/saffron accents, tinted windows, custom wheels, and headlights. This guarantees ultra-fast load time (< 100ms), 0 KB external GLB network payload (beating the <= 1.8MB budget completely), zero CORS/404 issues, and high 60fps performance on mobile and desktop.
- **Scroll Spline Animation:** Uses `CatmullRomCurve3` or scroll progress interpolation (`window.scrollY / maxScroll`) to smoothly rotate and steer the bus along an S-curve road as the user scrolls through the hero and intro sections.
- **Performance Budget:** Lazy-initialized on canvas viewport intersection, uses `requestAnimationFrame` throttled rendering during idle states to preserve battery and maintain < 1.5s 4G page load speed.

### 2. EMI Calculator & Package Catalog (LAND-02, LAND-03)
- **Vanilla-Tilt.js Integration:** Local standalone library `pb_public/js/vanilla-tilt.min.js`. Initialized with `{ max: 15, perspective: 1000, glare: true, "max-glare": 0.35, speed: 400 }`.
- **Dynamic EMI Calculator:** Alpine.js reactive component reacting instantaneously to package price and tenure selection:
  `monthly_emi = Math.round(selectedPackage.total_price / selectedTenure)`.
  Shows breakdown: Total Tour Price, Tenure Months, Monthly Installment, and "Travel Unlocks at EMI #N".
- **Package Grid:** Dynamically populated from active packages or rendered via Go template/PocketBase API.

### 3. Booking Status & Golden Travel Eligibility Pass (LAND-04, LAND-05)
- **Public Lookup Endpoint:** `GET /api/public/booking-status?query={booking_code_or_phone}`.
- **Golden Pass Design:** Luxury VIP card with metallic golden gradient (`from-amber-400 via-yellow-500 to-amber-600`), holographic shimmer, passenger name, booking code, package title, travel status badge (`LOCKED` / `ELIGIBLE TO TRAVEL` / `SCHEDULED`), progress bar of paid EMIs (`X of Y EMIs Paid`), QR code placeholder / verification link, and itemized receipt slips breakdown with print/download capability.

### 4. Distributor Dashboard & Analytics (DIST-01, DIST-03, DIST-04)
- **Route:** `GET /distributor/dashboard` served via PocketBase hook/custom route rendering `pb_public/distributor/index.html` with Alpine.js and HTMX.
- **Metrics API:** `GET /api/distributor/analytics` reading directly from `distributor_daily_analytics` view:
  - Total Active Subscriptions
  - Total Overdue Amount
  - Collected Today
  - Cash in Agents' Custody (field float)
- **Subordinate Agent Roster:** Queries agents where `distributor_id = auth.id`, showing agent name, phone, today's collections, unremitted cash in custody, and overdue account count.
- **Delinquent Watchlist (>30 Days Overdue):** Identifies installments with `due_date < (now - 30 days)` and `status != 'paid'`, flagging high-risk subscriber accounts.

### 5. Handover Approval Panel (DIST-02)
- **Pending Handovers API:** `GET /api/distributor/pending-handovers` fetching `cash_handovers` where `distributor_id = auth.id && status = 'initiated'`.
- **Verification Trigger:** Distributor enters the 4-digit OTP provided by the agent and submits to `POST /api/handover/verify` (built in Phase 2). Confirms receipt, transitions handover to `confirmed`, and locks installments to `distributor_confirmed`.
</decisions>

<canonical_refs>
## Canonical References

- `PRD.md` — Section 4.1 (Public Web / PWA Discovery), Section 4.3 (Distributor Portal), Section 5.3 (Cash Handover & Custody Verification)
- `GEMINI.md` — Tech stack rules (Three.js r128 CDN/local, Vanilla-Tilt.js, HTMX, Alpine.js, Tailwind standalone)
- `.planning/REQUIREMENTS.md` — Requirements LAND-01..05, DIST-01..04
- `.planning/ROADMAP.md` — Phase 3 Success Criteria
</canonical_refs>
