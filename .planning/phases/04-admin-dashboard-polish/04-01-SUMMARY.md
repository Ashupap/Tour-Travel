# Plan 04-01 Summary: Admin Portal Shell, Portfolio Metrics & Risk Watchlist

## Requirements Covered
- ADMN-01, ADMN-02, SEC-04 (supporting: DAT-07)

## Deliverables
- **Route mapping (`pb_hooks/09_admin_api.pb.js`)**:
  - `GET /admin/dashboard` → 302 redirect to `/admin/index.html`.
  - `GET /api/admin/portfolio` (`ADMN-01`): reads the `admin_portfolio_overview` SQLite view (`portfolio_summary`) and always DAO-recomputes the metrics, using the view values when non-zero for real-time accuracy; returns `{ metrics, source: "view+dao" | "dao" }`.
  - `GET /api/admin/risk-watchlist` (`ADMN-02`): subscriptions with `travel_status IN ('scheduled','completed')` and ≥ 1 past-due unpaid installment; computes `overdue_amount`, `overdue_count`, `max_days_overdue`, joins agent/distributor/package names; supports `?sort=days|amount|name` and `?order=asc|desc` with echo of params.
  - Every handler declares its own in-handler `requireAdmin()` (401 anonymous, 403 non-admin role, superuser accepted) — the PocketBase JSVM re-evaluates handlers outside file scope, so helpers cannot be shared at file top level (`SEC-04`).
- **Admin portal (`pb_public/admin/index.html` + `pb_public/admin/admin.js`)**: Alpine.js portal with credentials login (role=admin user token in localStorage), KPI metric cards, sortable risk-watchlist table, tab shell for the package manager and manifest sections added by later plans.
- **Service worker (`pb_public/sw.js`)**: `CACHE_NAME` bumped to `bharatyatra-cache-v3`; `/admin/index.html` and `/admin/admin.js` added to the precache list.
- **Tailwind**: `tailwind.config.js` content globs extended to cover the admin page and controller; `npm run build:css` rebuild required.

## Bugs fixed during Phase 4 verification
- `max_days_overdue` always computed as 0: `due_date` is stored as an ISO string with a trailing `Z`, and the handler appended a second `Z` before `Date.parse` → `NaN`. Fixed with a parse helper that only appends `Z` for naive timestamps (`pb_hooks/09_admin_api.pb.js`).

## Verification
- Verified in `tests/phase4_verification.js` under `ADMN-01`, `ADMN-02`, and `SEC-04` (portfolio metric thresholds against a seeded ₹36,000 subscription with paid + past-due EMIs, view-row cross-check, watchlist inclusion/exclusion and sort-order assertions, 401/403 matrix on all admin endpoints).
