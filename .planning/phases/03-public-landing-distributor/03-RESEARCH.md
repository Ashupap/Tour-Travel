# Phase 03: Public Landing & Distributor — Research

**Gathered:** 2026-09-21
**Status:** Complete

## 1. Three.js 3D Hero Bus Architecture (LAND-01)

### Visual Quality & Performance Standards
- **CDN / Vendor Asset:** Local copy of Three.js r128 (`pb_public/js/three.min.js`, ~600KB uncompressed, ~150KB gzip/brotli), perfectly matching PWA offline-first rules (no external network dependencies needed).
- **Procedural Sleeper Bus Mesh vs External GLTF:**
  - An external GLTF model can introduce missing material/texture paths, slow network requests, and large payloads.
  - A procedural Three.js luxury sleeper bus built with modular primitives (`BoxGeometry`, `CylinderGeometry`, rounded bevels, saffron/golden coach livery `#D97706`, high-gloss metallic finish `#F59E0B`, tinted panoramic windows with internal cabin glow, LED headlights, chrome grill, and detailed dual-axle wheels) guarantees:
    1. Zero external 3D file download (0 KB network overhead, well within the <= 1.8MB budget).
    2. Sub-50ms instant rendering on initial page load.
    3. Flawless rendering in offline PWA / airplane mode.
- **Scroll-Driven Spline Interpolation:**
  - Create a 3D spline curve using `THREE.CatmullRomCurve3([p0, p1, p2, p3])` mimicking a scenic Indian highway or hill pass.
  - Track normalized scroll position `t = window.scrollY / (heroSectionHeight - window.innerHeight)`.
  - Calculate target position `curve.getPointAt(t)` and tangent orientation `curve.getTangentAt(t)`.
  - Smoothly interpolate camera/bus transforms using linear interpolation (`lerp`) during the `requestAnimationFrame` loop.
  - Throttled when canvas is out of viewport via `IntersectionObserver` to preserve GPU and battery.

---

## 2. Package Catalog, Vanilla-Tilt & Dynamic EMI Calculator (LAND-02, LAND-03)

### Vanilla-Tilt.js Setup
- Bundle `pb_public/js/vanilla-tilt.min.js`.
- Config options for package cards:
  ```js
  VanillaTilt.init(document.querySelectorAll(".package-tilt-card"), {
    max: 15,
    perspective: 1000,
    speed: 400,
    glare: true,
    "max-glare": 0.35,
    scale: 1.02
  });
  ```
- Glare element automatically styles radiant lighting on hover, creating a premium luxury feel.

### Alpine.js Reactive EMI Calculator
- Reactive state:
  ```js
  {
    selectedPackage: packages[0],
    selectedTenure: 6,
    get monthlyEmi() {
      if (!this.selectedPackage || !this.selectedTenure) return 0;
      return Math.round(this.selectedPackage.total_price / this.selectedTenure);
    },
    get minEmis() {
      return this.selectedPackage ? this.selectedPackage.min_emis_to_travel : 2;
    },
    get travelUnlockAmount() {
      return this.monthlyEmi * this.minEmis;
    }
  }
  ```
- Dynamically highlights the "Travel Unlocked" milestone badge when calculated.

---

## 3. Public Booking Status & Golden Travel Eligibility Pass (LAND-04, LAND-05)

### Verification Lookup Logic
- Endpoint: `GET /api/public/booking-status?query={booking_code_or_phone}`.
- Searches `subscriptions` collection for exact match on `booking_code` or `customer_phone`.
- Returns:
  - Customer Name & Masked Phone
  - Booking Reference Code
  - Package Details (Destination, Duration, Total Cost)
  - Travel Eligibility Status (`locked`, `eligible`, `scheduled`, `completed`)
  - Paid EMIs count vs required minimum EMIs to travel
  - Breakdown of all installments (due date, paid date, amount, receipt slip ID, payment mode)
- HTMX support:
  - Form has `hx-get="/api/public/booking-status" hx-target="#status-result" hx-indicator="#status-spinner"`.
  - Endpoint returns rich HTML VIP pass if requested by HTMX (`HX-Request: true`), or JSON for programmatic API clients.

### VIP Golden Pass Aesthetics
- Double-bordered metallic golden container (`border-amber-400/80 bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950`).
- Holographic embossed watermark emblem.
- Dynamic Status Badge:
  - `ELIGIBLE TO TRAVEL`: Glowing Emerald Badge with VIP checkmark.
  - `LOCKED`: Amber Badge showing remaining EMIs required ("Pay 1 more EMI to unlock travel!").
- Printable receipt slip buttons and single-click PDF / browser print view.

---

## 4. Distributor Territory Portal & Analytics (DIST-01 to DIST-04)

### Territory Analytics API
- Endpoint: `GET /api/distributor/analytics`
- Authenticates distributor token from header or cookie (`SEC-04`).
- Queries `distributor_daily_analytics` view where `distributor_id = auth.id`.
- Returns key KPIs:
  - `total_active_subscriptions`: Count of active memberships.
  - `total_overdue_amount`: Outstanding overdue rupees.
  - `collected_today`: Today's collections.
  - `cash_in_agents_custody`: Total physical cash held across subordinate agents.

### Agent Roster & Delinquency API
- Endpoint: `GET /api/distributor/agents`: Lists agents assigned to distributor, aggregating their today's collections, unremitted cash, and active customer counts.
- Endpoint: `GET /api/distributor/delinquents`: Identifies overdue installments where `due_date < (current_date - 30 days)` and `status != 'paid'`, highlighting critical risk accounts.
- Endpoint: `GET /api/distributor/pending-handovers`: Lists unverified handovers awaiting distributor OTP verification.

---

## 5. Handover Approval Workflow (DIST-02)
- Reuses `POST /api/handover/verify` from Phase 2.
- Distributor inputs 4-digit OTP directly into the pending handovers card.
- HTMX or Alpine.js submits payload `{ handover_id, otp_code }`.
- On success, instantly reloads the handovers panel, removes the card, updates cash custody totals, and shows confirmation toast.
