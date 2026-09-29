# Plan 04-04 Summary: Production Hardening & Phase 4 Verification Suite

## Requirements Covered
- ADMN-01, ADMN-02, ADMN-03, ADMN-04, SEC-04

## Deliverables
- **Branded 404 fallback (`pb_public/404.html` + `pb_hooks/10_error_pages.pb.js`)**:
  - PocketBase owns the root wildcard route `GET /{path...}` (registered after the hooks) and its built-in static handler answers missing files by serving `/index.html` with HTTP 200 (`--indexFallback`, default true), so a hook wildcard route can never win. Instead, a router middleware registered through `$app.onBeforeServe().preAdd(...)` runs before the static handler.
  - The middleware only acts when `c.pathParam("*")` is set (i.e. the request actually fell through to the static wildcard), so explicit hook routes (`/agent/dashboard`, `/admin/dashboard`, …), `/api/*` and `/_/*` are untouched — API JSON 404 semantics are preserved.
  - Existing files/directories are detected with `$os.dirFS("pb_public").stat()`; missing page paths return **HTTP 404 + `pb_public/404.html`** (Obsidian & Gold branded page with links to `/`, `/#packages`, agent login), while missing asset paths (extension + non-`text/html` Accept) return a JSON 404. The page is read as bytes by `$os.readFile` and decoded with `decodeURIComponent` (goja has no `TextDecoder`), then cached in the middleware closure.
- **Deployment & operations guide (`docs/DEPLOYMENT.md`)**: build (`npm ci && npm run build`), runtime and first-run account creation, hardened systemd unit (`--hooksWatch=false`, `UMask=0077`), Caddy reverse proxy with automatic HTTPS + security headers + rate-limit snippets, API-based backup script + cron (PocketBase v0.22 has no CLI backup command), restore procedure, security checklist mapped to SEC-01..04, and the release checklist running `tests/phase1..phase4_verification.js`.
- **Verification suite (`tests/phase4_verification.js`)**: 84 assertions covering the SEC-04 role matrix (401/403 on every `/api/admin/*` endpoint for anonymous/agent/distributor tokens), admin portal shell, ADMN-01 portfolio metrics (seeded ₹36,000 subscription with a paid and a past-due EMI; `admin_portfolio_overview` view-row cross-check), ADMN-02 watchlist (completed-with-overdue included with correct amounts/days, locked excluded, sort params), ADMN-03 package CRUD lifecycle, ADMN-04 JSON+CSV manifest, branded 404 behavior, and the SW cache bump.

## Verification
- `node tests/phase4_verification.js` → **84/84 passed**.
- Regression gate (re-run after all Phase 4 changes): `phase1` **33/33**, `phase2` **29/29**, `phase3` **46/46** — all green.
