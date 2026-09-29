# Plan 04-02 Summary: Package Manager CRUD & Live Landing Catalog

## Requirements Covered
- ADMN-03, SEC-04

## Deliverables
- **Admin API (`pb_hooks/09_admin_api.pb.js`)**:
  - `GET /api/admin/packages` — full list including inactive packages (admin guard).
  - `POST /api/admin/packages` — create with field-level validation (title, destination, duration_days, total_price, allowed_tenures, min_emis_to_travel) → `400` with per-field `data` errors.
  - `PATCH /api/admin/packages/:id` — partial update (price, tenures, active flag, itinerary…); `404` for unknown ids.
  - `DELETE /api/admin/packages/:id` — soft-deactivates (`is_active=false`) when subscriptions reference the package, otherwise hard-deletes; returns `{ soft_deactivated }` or `{ deleted }`.
  - `GET /api/public/packages` — unauthenticated active-only catalog (`id, title, destination, duration_days, total_price, allowed_tenures, min_emis_to_travel, itinerary, cover_image_url`).
- **Package manager UI (`pb_public/admin/index.html` + `admin.js`)**: package table, create/edit modal form with tenure chips, cover-image upload through the PocketBase multipart file API (`PATCH /api/collections/packages/records/:id`), delete with soft/hard semantics reflected in the UI.
- **Live landing catalog (`pb_public/js/landing.js`)**: `loadServerPackages()` fetches `/api/public/packages` and merges the server records over the bundled `TOUR_PACKAGES` static catalog (package cards, EMI calculator and booking modal all consume the merged list); silent fallback to the static catalog when offline so the PWA keeps working with no connectivity.

## Verification
- Verified in `tests/phase4_verification.js` under `ADMN-03` (create → public catalog visibility → validation 400 → PATCH price → unknown-id 404 → hard delete of unreferenced package → soft deactivate + public exclusion + admin visibility of a referenced package → reactivation) and `SEC-04` (anonymous/agent 401/403 on GET and POST).
