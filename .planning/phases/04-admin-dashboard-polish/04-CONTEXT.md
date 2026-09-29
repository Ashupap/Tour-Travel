# Phase 04: Admin Dashboard & Production Polish — Context

**Gathered:** 2026-09-29
**Status:** Ready for planning
**Source:** PRD Express Path (`PRD.md`) + `GEMINI.md` + `REQUIREMENTS.md`

<domain>
## Phase Boundary

This phase delivers the admin master portal and production readiness work:
- Admin Dashboard (`/admin/dashboard`) showing portfolio health metrics read from the `admin_portfolio_overview` SQLite view: Total Booked Value, Total Realized Cash, Total Defaults, Cash in Transit / field float (`ADMN-01`).
- Post-travel default risk watchlist: customers with `travel_status IN ('scheduled','completed')` who have >= 1 overdue installment, sortable in the UI (`ADMN-02`).
- Package Manager UI for full CRUD on `packages` (title, destination, duration, price, allowed tenures, min EMIs, cover image, itinerary, active status) where changes appear immediately on the public landing page (`ADMN-03`).
- Bus Manifest export for a specific tour: CSV download (plus printable view) of all passengers scheduled for that tour with payment status (`ADMN-04`).
- Production hardening: branded error pages (404/500), PocketBase rate limiting, security headers/CSP review, and a deployment guide (systemd + Caddy/SSL).

### Explicitly Out of Scope
- Seat allotment / booking calendar (v1 admin does manual seat allotment via the manifest export — see REQUIREMENTS.md deferrals).
- Payment gateway integration, SMS/email notifications.
- Public landing redesign work (completed in Phase 3 follow-up iterations).
</domain>

<decisions>
## Implementation Decisions

### 1. Admin Portal Architecture (ADMN-01, ADMN-02)
- **Route pattern matches Phase 3:** `routerAdd("GET", "/admin/dashboard", ...)` redirecting to a static `pb_public/admin/index.html` rendered with Alpine.js + Tailwind (same stack as `pb_public/distributor/`), served from `pb_hooks/09_admin_api.pb.js`.
- **Auth:** identical login flow to the distributor portal — `POST /api/collections/users/auth-with-password` with a `role = 'admin'` check on the returned record, token stored in `localStorage`; every admin API call sends `Authorization: Bearer <token>`. Route guards require `role === 'admin'` and return 401/403 otherwise (`SEC-04`).
- **Metrics source:** `GET /api/admin/portfolio` reads the `admin_portfolio_overview` view (`gross_portfolio_value`, `total_realized_cash`, `total_overdue_cash`, `post_travel_default_count`, `field_float`) with a DAO fallback recomputation (pattern proven in `pb_hooks/08_distributor_api.pb.js`) so metrics are correct even when the view row is stale or zero.
- **Watchlist source:** `GET /api/admin/risk-watchlist` queries subscriptions with `travel_status IN ('scheduled','completed')`, joins their installments, keeps accounts with >= 1 unpaid installment past `due_date`, and returns rows with overdue amount, days overdue, agent/distributor names — client-side sortable by amount / days / name.

### 2. Package Manager CRUD (ADMN-03)
- **Endpoints:** `GET /api/admin/packages` (list incl. inactive), `POST /api/admin/packages` (create), `PATCH /api/admin/packages/:id` (update), `DELETE /api/admin/packages/:id` (soft-deactivate via `is_active = false`, hard delete only when no subscriptions reference it).
- **Cover image:** uploaded as `multipart/form-data` against the PocketBase file API (`/api/collections/packages/records` with `cover_image` file part), max 5MB, mime allow-list already enforced by the collection schema.
- **Immediate landing reflection:** landing page package catalog currently comes from the hardcoded `TOUR_PACKAGES` array in `pb_public/js/landing.js`. Add a public read `GET /api/public/packages` (only `is_active = true`, which is already the collection `listRule`) and have `landing.js` fetch it on boot, falling back to the static array when offline or on error — so admin edits show up on reload with zero deploy step, and the offline-first PWA behavior is preserved.

### 3. Bus Manifest Export (ADMN-04)
- **Endpoint:** `GET /api/admin/manifest?tour={package_or_tour_id}&format=csv|json` returning all subscriptions for that package ordered by booking code, with customer name, phone, package, tenure, paid EMIs / total EMIs, amount paid, outstanding, travel_status, and last payment date.
- **CSV:** proper RFC-4180 quoting, UTF-8 BOM prefix for Excel compatibility with ₹ and Odia text, `Content-Disposition: attachment; filename="manifest-<package>-<date>.csv"`.
- **UI:** "Bus Manifest" section in the admin portal with package selector, "Download CSV" and "Print" actions (print uses a print-styled HTML table rendered from the JSON payload).

### 4. Production Hardening (Phase 4 exit)
- Branded 404 and error handling for unknown app routes (PocketBase already JSON-404s API paths; add HTML fallback for browser routes).
- Rate limiting guidance + PocketBase settings (auth attempt throttle, file upload limits) verified via config, documented in the deployment guide.
- `docs/DEPLOYMENT.md`: systemd unit, Caddy reverse proxy with automatic HTTPS, environment/backup (PocketBase backup zip) procedure, and release checklist.
- `tests/phase4_verification.js`: end-to-end suite asserting ADMN-01..04 plus SEC-04 role enforcement, and regression runs of Phase 1–3 suites.
</decisions>

<canonical_refs>
## Canonical References

- `PRD.md` — Admin portal section, bus manifest export, deployment/production notes
- `GEMINI.md` — Tech stack rules (PocketBase hooks JS, HTMX/Alpine/Tailwind, no external CDN)
- `.planning/REQUIREMENTS.md` — Requirements ADMN-01..04
- `.planning/ROADMAP.md` — Phase 4 Success Criteria
- `.planning/phases/03-public-landing-distributor/03-04-PLAN.md` — Auth-guard pattern reused for admin APIs
</canonical_refs>
