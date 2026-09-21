# Phase 02: Agent PWA Core — Context

**Gathered:** 2026-09-21
**Status:** Ready for planning
**Source:** PRD Express Path (`PRD.md`) + `GEMINI.md`

<domain>
## Phase Boundary

This phase delivers the complete offline-first Agent experience for BharatYatra PWA:
- Custom PocketBase API endpoints for morning manifest sync, atomic batch collection sync, and OTP cash handovers
- PWA manifest (`manifest.json`) and Service Worker (`sw.js`) with cache-first static caching and Background Sync event handler
- Client-side IndexedDB persistence engine using Dexie.js (`offline-store.js`) storing packages, subscriptions, installments, and outbox queue
- Mobile-responsive Agent Dashboard with online/offline badge, daily recovery route, "Collect EMI" modal, and outbox counter
- Monospaced thermal-style receipt modal with copyable text, print triggers, and WhatsApp share URL (`wa.me/`)
- EOD Cash Handover flow: "Cash in Hand" calculation, 4-digit OTP generation, and distributor verification handover state transition

Public landing page with 3D bus canvas belongs to Phase 3. Admin portal belongs to Phase 4.
</domain>

<decisions>
## Implementation Decisions

### API Endpoints (API-01 to API-04, SEC-04)
- `/api/agent/sync-manifest` (GET): Validates `role = 'agent'`. Returns all active `subscriptions` where `agent_id = auth.id` and all linked `installments` in `pending` or `overdue` status, along with package reference data.
- `/api/agent/batch-sync` (POST): Validates `role = 'agent'`. Accepts an array of payment items `{ installment_id, payment_mode, paid_at, receipt_slip_id, idempotency_key }`. Executes atomically inside a single DB transaction. Rejects already synced idempotency keys without failing the rest of the batch. Updates status to `paid`, sets `collected_by = agent.id`, and transitions `handover_status = 'agent_custody'`.
- `/api/handover/initiate` (POST): Validates `role = 'agent'`. Calculates total cash collected by agent currently in `agent_custody` (`status = 'paid' && payment_mode = 'cash' && handover_status = 'agent_custody'`). Generates a cryptographically secure 4-digit numeric OTP (`otp_code`). Creates a `cash_handovers` record in `'initiated'` status linked to all included installment IDs. Returns session summary with OTP.
- `/api/handover/verify` (POST): Validates `role = 'distributor'` or `'admin'`. Accepts `{ handover_id, otp_code }`. Validates that `distributor_id = auth.id` and OTP matches. Transitions handover record to `'verified'`, sets `verified_at = now()`, and atomically transitions all linked installments to `handover_status = 'distributor_confirmed'`.

### PWA & Offline Engine (PWA-01 to PWA-05)
- `manifest.json`: Web app manifest configured for standalone display, portrait orientation, theme color `#D97706` (amber gold), icons (192x192, 512x512), `start_url: "/agent/dashboard"`.
- `sw.js`: Service worker implementing:
  - Cache-First for local static assets (`/`, `/agent/dashboard`, CSS, icons, HTMX, Alpine, Dexie).
  - Background Sync event listener: listens for `'sync-installments'`, reads unsynced payments from Dexie `outbox`, sends them to `/api/agent/batch-sync`, updates local sync status, and posts message to active clients.
- `offline-store.js`: Dexie database `BharatYatraDB` with tables:
  - `packages: "id, title, min_emis_to_travel"`
  - `subscriptions: "id, booking_code, customer_name, customer_phone, agent_id, travel_status"`
  - `installments: "id, subscription_id, installment_no, due_date, amount, status, handover_status, idempotency_key"`
  - `outbox: "++local_id, installment_id, subscription_id, amount, payment_mode, receipt_slip_id, idempotency_key, collected_at, sync_status"`

### Agent Dashboard & Receipt UI (AGNT-01 to AGNT-05)
- Mobile-first dashboard layout served by PocketBase at `/agent/dashboard`.
- Real-time online/offline connectivity pill with indicator dot and pending outbox badge ("Offline: 3 pending sync").
- Daily recovery list grouped by due date with customer contact quick-actions (Call, WhatsApp).
- "Collect EMI" modal: Alpine.js reactive modal allowing selection of Cash or UPI, generating offline receipt slip ID `OFF-{agent_id}-{timestamp}`.
- Monospaced 58mm/80mm thermal receipt preview displaying booking code, customer name, installment number, amount, payment mode, and verification QR/text.
- WhatsApp share button: encodes receipt summary into `https://wa.me/{phone}?text={encoded_summary}`.
- "Cash in Hand" card displaying current collected cash awaiting distributor handover.
</decisions>

<canonical_refs>
## Canonical References

- `PRD.md` — Section 5.2 (Offline Synchronization Lifecycle) & Section 5.3 (Cash Handover & Custody Verification)
- `GEMINI.md` — Coding standards, business rules, receipt ID formats (`OFF-{agent_id}-{timestamp}`, `SLIP-YYYYMM-XXXX`)
- `.planning/REQUIREMENTS.md` — Requirements API-01..04, PWA-01..05, AGNT-01..05, SEC-04
- `.planning/ROADMAP.md` — Phase 2 Success Criteria
</canonical_refs>
