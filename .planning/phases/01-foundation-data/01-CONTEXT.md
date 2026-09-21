# Phase 01: Foundation & Data — Context

**Gathered:** 2026-09-21
**Status:** Ready for planning
**Source:** PRD Express Path (`PRD.md`) + `GEMINI.md`

<domain>
## Phase Boundary

This phase delivers the foundational data backbone for the BharatYatra PWA:
- Standalone PocketBase runtime and project structure
- 5 PocketBase collections: `users` (auth), `packages`, `subscriptions`, `installments`, `cash_handovers`
- Automated business logic hooks in `pb_hooks/` (installment schedule generation, travel unlock engine, idempotency guards)
- PocketBase collection security access rules (agent isolation, distributor scoping, handover immutability)
- 2 SQLite analytical views: `distributor_daily_analytics` and `admin_portfolio_overview`
- Seeding and end-to-end automated verification of the data engine

No frontend UI templates (HTMX/Alpine/Three.js) or Service Worker/Dexie offline sync are built in this phase — those belong to Phase 2, 3, and 4.
</domain>

<decisions>
## Implementation Decisions

### Data Schema (DAT-01 to DAT-07)
- `users`: Standard auth collection extended with `role` (admin, distributor, agent), `phone` (unique, indexed), `distributor_id` (relation -> users, optional/required for agent), `commission_percentage` (number, default 0.00), `is_active` (bool, default true).
- `packages`: Base collection with `title` (text), `destination` (text), `duration_days` (number), `total_price` (number), `allowed_tenures` (json, e.g. [6, 9, 12]), `min_emis_to_travel` (number, default 2 or 3), `cover_image` (file), `itinerary` (text/editor), `is_active` (bool, default true).
- `subscriptions`: Base collection with `booking_code` (unique, indexed, format BY-YYYY-XXXX), `customer_name` (text), `customer_phone` (text, indexed), `customer_address` (text), `package_id` (relation -> packages), `agent_id` (relation -> users, agent), `distributor_id` (relation -> users, distributor), `tenure_months` (number: 6, 9, or 12), `total_amount` (number), `monthly_emi_amount` (number), `paid_emis_count` (number, default 0), `travel_status` (select: locked, eligible, scheduled, completed; default locked), `booking_date` (datetime).
- `installments`: Base collection with `subscription_id` (relation -> subscriptions, cascade delete), `installment_no` (number 1..12), `due_date` (datetime), `amount` (number), `status` (select: pending, paid, overdue; default pending), `paid_at` (datetime, nullable), `collected_by` (relation -> users, agent), `payment_mode` (select: cash, upi), `handover_status` (select: agent_custody, distributor_confirmed; default agent_custody), `receipt_slip_id` (text, unique), `idempotency_key` (text, indexed).
- `cash_handovers`: Base collection with `agent_id` (relation -> users), `distributor_id` (relation -> users), `total_amount` (number), `installments_covered` (multiple relation -> installments), `otp_code` (text, 4 digits), `status` (select: initiated, verified, rejected; default initiated), `verified_at` (datetime, nullable).
- `distributor_daily_analytics`: SQLite view aggregating `total_active_subscriptions`, `total_overdue_amount`, `collected_today`, and `cash_in_agents_custody` per distributor.
- `admin_portfolio_overview`: SQLite view calculating gross portfolio value, total realized cash, total overdue cash, post-travel defaults, and field float.

### Hooks & Business Automation (HOOK-01 to HOOK-03)
- `subscriptions_hooks.pb.js`: Intercepts `onModelAfterCreate` (or `onRecordAfterCreateRequest`) for `subscriptions`. Automatically inserts $N$ installments ($N = tenure\_months$) with $amount = total\_amount / tenure\_months$ and monthly rolling due dates (due date $i$ = booking_date + $i$ months).
- `installment_hooks.pb.js`: Intercepts `onModelAfterUpdate` for `installments`. When status changes to `paid`:
  - Recalculates `paid_emis_count` for the parent subscription.
  - Checks if `paid_emis_count >= package.min_emis_to_travel`.
  - Automatically promotes subscription `travel_status` to `'eligible'` if threshold is met.
  - Automatically sets `paid_at = new Date()` if unset.
- `idempotency_hooks.pb.js`: Rejects creation of any installment or payment write if `idempotency_key` is already present. Format: `{agent_id}-{installment_id}-{timestamp}`.

### Access Rules & Security (SEC-01 to SEC-03)
- `subscriptions`:
  - List/View: `@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && distributor_id = @request.auth.id) || (@request.auth.role = 'agent' && agent_id = @request.auth.id)`
  - Create: `@request.auth.role = 'admin' || @request.auth.role = 'agent'`
  - Update: `@request.auth.role = 'admin'`
- `installments`:
  - List/View: `@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && subscription_id.distributor_id = @request.auth.id) || (@request.auth.role = 'agent' && subscription_id.agent_id = @request.auth.id)`
  - Update: `@request.auth.role = 'admin' || (@request.auth.role = 'agent' && subscription_id.agent_id = @request.auth.id && handover_status != 'distributor_confirmed')`
  - Rule: Once `handover_status = 'distributor_confirmed'`, installments cannot be edited by agents.
- `cash_handovers`:
  - List/View: `@request.auth.role = 'admin' || agent_id = @request.auth.id || distributor_id = @request.auth.id`
  - Create: `@request.auth.role = 'agent'`
  - Update: `@request.auth.role = 'distributor' || @request.auth.role = 'admin'`

### PocketBase Runtime Choice
- Standalone PocketBase executable v0.22.x for Windows (`pocketbase.exe`) with `pb_hooks/` for JavaScript runtime triggers and JS migrations in `pb_migrations/`.
- No separate Go compilation needed for the database engine & hooks, ensuring instant portability, deterministic execution, and compatibility with the local environment.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture & Requirements
- `PRD.md` — Complete Product Requirement Document with DB schemas, SQL view definitions, and state transitions
- `GEMINI.md` — Project standards, stack rules, coding guidelines, business rules
- `.planning/REQUIREMENTS.md` — Traceable requirements (DAT-01..07, HOOK-01..03, SEC-01..03)
- `.planning/ROADMAP.md` — Phase 1 goals, success criteria, and plans breakdown

### Official Tooling References
- PocketBase v0.22 JS VM Reference (`$app`, `onModelAfterCreate`, `onRecordBeforeUpdateRequest`, `Record`, `Dao`)
- SQLite 3 syntax for Window functions and Common Table Expressions used in analytical views
</canonical_refs>

<specifics>
## Specific Ideas

- SQL for `distributor_daily_analytics` directly adapted from PRD Section 7.
- SQL for `admin_portfolio_overview` aggregating total subscriptions, total collected amount, overdue installments, float in custody, and post-travel defaults.
- Seed script (`pb_hooks/00_seed.pb.js` or CLI script) to populate test admin, distributor, agent, package, and test subscription to verify automated triggers immediately.
</specifics>

<deferred>
## Deferred Ideas

- API custom routes (`/api/agent/sync-manifest`, `/api/agent/batch-sync`, `/api/handover/*`) — Phase 2
- Service Worker & Dexie.js offline store — Phase 2
- Public landing page, Three.js bus canvas, Vanilla-Tilt cards — Phase 3
- Web UI templates (Go `html/template` / HTMX / Alpine.js) — Phase 2 & 3
</deferred>
