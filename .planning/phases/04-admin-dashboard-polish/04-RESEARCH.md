# Phase 04: Admin Dashboard & Production Polish — Research

**Gathered:** 2026-09-29
**Status:** Complete

## 1. Admin Portfolio Metrics (ADMN-01)

### `admin_portfolio_overview` View Columns (created in Phase 1 migration `1726940003_analytics_views.js`)
| Column | Meaning |
|--------|---------|
| `id` | Constant `'portfolio_summary'` (single-row view) |
| `gross_portfolio_value` | `SUM(subscriptions.total_amount)` — Total Booked Value |
| `total_realized_cash` | `SUM(installments.amount)` where `status = 'paid'` — Total Realized Cash |
| `total_overdue_cash` | `SUM(installments.amount)` where `due_date <= now AND status != 'paid'` |
| `post_travel_default_count` | Distinct subscriptions `travel_status IN ('scheduled','completed')` with >= 1 overdue installment |
| `field_float` | `SUM(installments.amount)` where `handover_status = 'agent_custody' AND status = 'paid'` — Cash in Transit |

Access rules: `listRule`/`viewRule` = `@request.auth.role = 'admin'` only (`SEC-02`).

### Real-time verification pattern
`pb_hooks/08_distributor_api.pb.js` reads the view row via `findRecordById` and, when a metric is zero, recomputes it with `findRecordsByExpr` DAO queries. Admin API reuses this pattern so a freshly seeded test environment (view may not have refreshed) still reports accurate numbers.

## 2. Post-Travel Default Risk Watchlist (ADMN-02)

- Filter: `subscriptions.travel_status IN ('scheduled','completed')`.
- Join: all `installments` for each subscription; keep rows where at least one installment has `status != 'paid' AND due_date <= CURRENT_TIMESTAMP`.
- Row payload: `booking_code`, `customer_name`, `customer_phone`, `package title`, `travel_status`, `overdue_amount` (sum), `overdue_count`, `max_days_overdue`, `agent_name`, `distributor_name`.
- Sortable client-side (Alpine.js `x-sort` style computed arrays) by: days overdue (default desc), overdue amount desc, customer name asc — satisfies "list is accurate and sortable".
- Distinct from the distributor's >30-day delinquency view (`DIST-04`): the admin watchlist has **no 30-day grace** — any overdue installment after travel flags the account.

## 3. Package Manager CRUD (ADMN-03)

### Collection rules already in place (Phase 1, `01-04-PLAN.md`)
- `packages.listRule`: `is_active = true || @request.auth.role = 'admin'` → unauthenticated/public callers see only active packages; admins see all.
- `packages.createRule` / `updateRule` / `deleteRule`: `@request.auth.role = 'admin'` only.
- Fields: `title`, `destination`, `duration_days`, `total_price`, `allowed_tenures` (JSON array, e.g. `[6,9,12]`), `min_emis_to_travel`, `cover_image` (file, <= 5MB, jpeg/png/webp), `itinerary` (editor HTML), `is_active`.

### CRUD transport
- PocketBase record API is sufficient for create/update (`POST/PATCH /api/collections/packages/records`), but the portal still gets thin wrappers under `/api/admin/packages` so that:
  1. Role enforcement (`role = 'admin'`) is explicit and testable (`SEC-04`),
  2. CSV-free normalized JSON (parse `allowed_tenures` string to array) reaches the UI,
  3. Delete is converted to safe soft-deactivation when subscriptions reference the package.
- Cover image upload: `FormData` with `cover_image` file part; returned `cover_image` URL shape is `/api/files/packages/<id>/<filename>`.

### Landing page reflection
- `pb_public/js/landing.js` currently defines `TOUR_PACKAGES` (hardcoded, 4 packages with `allowed_tenures`).
- Add boot-time fetch of `GET /api/collections/packages/records?filter=is_active=true&sort=title` (or the `/api/public/packages` wrapper) and merge into `packages:` state; on network failure keep static defaults (offline-first, SW-cache friendly).
- Package card images: landing currently uses `/images/pkg-*.jpg` static assets; when a record has `cover_image`, prefer the PocketBase file URL and fall back to the static image.

## 4. Bus Manifest Export (ADMN-04)

- Query: `subscriptions` where `package_id = {tour}` (field name per schema: verify in `1726940001_initial_schema.js`; fallback to filtering by package relation), `sort = booking_code`.
- Enrich per row: `paid_emis_count`, `total_emis`, sum of paid amount, outstanding = `total_amount - paid`, `travel_status`, last `paid_at`.
- CSV columns: `Booking Code, Customer, Phone, Package, Tenure (months), EMIs Paid, Total EMIs, Amount Paid (INR), Outstanding (INR), Travel Status, Last Payment`.
- RFC-4180 escaping (quote fields containing comma/quote/newline), UTF-8 BOM (`\uFEFF`) so Excel opens ₹/Odia correctly, filename `manifest-<slug>-YYYY-MM-DD.csv`.
- Printable view: same data rendered as an HTML table with `@media print` styling and a "Print" button (`window.print()`).

## 5. Production Hardening & Deployment

- **Error pages:** `routerAdd("GET", "/{path...}")` catch-all is risky (it would shadow API 404s); instead serve `pb_public/404.html` from a wildcard route restricted to non-`/api` and non-`/_` paths, returning status 404.
- **Rate limiting:** PocketBase settings — `RateLimits` (failed auth attempts), max upload size (already 5MB via collection rule), and Caddy-level request rate limits documented rather than reimplemented.
- **Security headers:** rely on PocketBase's default CSP for the admin UI; add `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` via Caddy config in the deployment guide.
- **Deployment artifacts:** `docs/DEPLOYMENT.md` — build CSS (`npm run build`), systemd unit for `pocketbase serve --http=127.0.0.1:8090`, Caddy reverse proxy with automatic TLS, `pb_data` backup rotation (PocketBase backup zip command), and an update checklist.

## 6. Verification Strategy (Phase 4 suite)

`tests/phase4_verification.js` (same harness style as `phase3_verification.js`: spawn PocketBase on 8090, seed, assert, teardown):
1. Admin login + **401/403 enforcement** on every `/api/admin/*` endpoint for anonymous and agent/distributor tokens (`SEC-04`).
2. **ADMN-01:** portfolio endpoint returns numeric `gross_portfolio_value`, `total_realized_cash`, `field_float` consistent with seeded data; matches `admin_portfolio_overview` view row.
3. **ADMN-02:** seed a `travel_status = 'completed'` subscription with an unpaid past-due installment → watchlist contains it; a `locked` subscription with the same overdue installment does not; sorting parameter changes row order.
4. **ADMN-03:** admin creates → edits → deactivates a package via API; `GET /api/public/packages` excludes the deactivated package immediately; non-admin create attempt → 403.
5. **ADMN-04:** CSV export returns 200, `text/csv` content type, BOM present, header row matches spec, one row per seeded passenger with correct payment status.
6. **Regression:** Phase 1, 2, 3 suites still pass.
