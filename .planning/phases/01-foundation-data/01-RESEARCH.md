# Phase 01: Foundation & Data — Technical Research

**Date:** 2026-09-21
**Target System:** PocketBase v0.22.x (Windows AMD64 standalone)
**Scope:** Schema, Collections, JS Hooks (`pb_hooks`), Access Rules, SQLite Views, Testing

## 1. Executive Summary

Phase 1 establishes the core data layer for the BharatYatra PWA. The system uses PocketBase as a unified SQLite engine, auth service, and real-time backend. PocketBase v0.22 provides an embedded JavaScript runtime (Goja VM) that loads all scripts in `pb_hooks/` and migrations in `pb_migrations/`. This allows full business automation (automatic installment generation, travel unlock calculations, idempotency verification) and view creation without requiring a Go compiler toolchain for local execution.

## 2. PocketBase Runtime & Installation Strategy

### 2.1 Distribution
PocketBase is distributed as a single static binary. On Windows 64-bit, the release artifact is:
`https://github.com/pocketbase/pocketbase/releases/download/v0.22.55/pocketbase_0.22.55_windows_amd64.zip`

### 2.2 Directory Layout
```
d:\New\Tour&Travel\
├── pocketbase.exe              # Standalone executable
├── pb_data/                   # SQLite database, WAL files, storage
├── pb_migrations/             # JS migration files
│   └── 1726940001_initial_schema.js
├── pb_hooks/                  # JS event triggers & custom route scripts
│   ├── 01_subscriptions.pb.js
│   ├── 02_installments.pb.js
│   └── 03_idempotency.pb.js
├── pb_public/                 # Public assets (prepared for Phase 2 & 3)
└── tests/
    └── phase1_verification.js # Node.js automated verification suite
```

## 3. PocketBase Schema & Collections

### 3.1 Collection Definitions
PocketBase collections can be defined as base collections, auth collections, or view collections.

1. **`users`** (Auth Collection extension):
   - `role`: Select field (`admin`, `distributor`, `agent`), required.
   - `phone`: Text field, required, unique, indexed.
   - `distributor_id`: Relation field (targets `users`), optional, cascadeDelete: false.
   - `commission_percentage`: Number field, min 0.0, default 0.0.
   - `is_active`: Bool field, default true.

2. **`packages`** (Base Collection):
   - `title`: Text, required.
   - `destination`: Text, required.
   - `duration_days`: Number, required, min 1.
   - `total_price`: Number, required, min 1.
   - `allowed_tenures`: Json, required (e.g., `[6, 9, 12]`).
   - `min_emis_to_travel`: Number, required, default 2.
   - `cover_image`: File, optional.
   - `itinerary`: Editor/Text, optional.
   - `is_active`: Bool, default true.

3. **`subscriptions`** (Base Collection):
   - `booking_code`: Text, unique, indexed (format: `BY-YYYY-XXXX`).
   - `customer_name`: Text, required.
   - `customer_phone`: Text, required, indexed.
   - `customer_address`: Text.
   - `package_id`: Relation (`packages`), required.
   - `agent_id`: Relation (`users`), required.
   - `distributor_id`: Relation (`users`), required.
   - `tenure_months`: Number (6, 9, 12), required.
   - `total_amount`: Number, required.
   - `monthly_emi_amount`: Number, required.
   - `paid_emis_count`: Number, default 0.
   - `travel_status`: Select (`locked`, `eligible`, `scheduled`, `completed`), default `locked`.
   - `booking_date`: DateTime, required.

4. **`installments`** (Base Collection):
   - `subscription_id`: Relation (`subscriptions`), required, cascadeDelete: true.
   - `installment_no`: Number (1..12), required.
   - `due_date`: DateTime, required.
   - `amount`: Number, required.
   - `status`: Select (`pending`, `paid`, `overdue`), default `pending`.
   - `paid_at`: DateTime, nullable.
   - `collected_by`: Relation (`users`), optional.
   - `payment_mode`: Select (`cash`, `upi`), optional.
   - `handover_status`: Select (`agent_custody`, `distributor_confirmed`), default `agent_custody`.
   - `receipt_slip_id`: Text, unique, optional.
   - `idempotency_key`: Text, indexed, optional.

5. **`cash_handovers`** (Base Collection):
   - `agent_id`: Relation (`users`), required.
   - `distributor_id`: Relation (`users`), required.
   - `total_amount`: Number, required.
   - `installments_covered`: Relation (`installments`), multiple, required.
   - `otp_code`: Text, 4 digits, required.
   - `status`: Select (`initiated`, `verified`, `rejected`), default `initiated`.
   - `verified_at`: DateTime, nullable.

### 3.2 SQL View Collections
In PocketBase, collections with `type: "view"` automatically create a backing SQLite VIEW and make it queryable via the standard REST API with full filter and sort capabilities.

1. **`distributor_daily_analytics`**:
```sql
SELECT 
    u.id AS id,
    u.id AS distributor_id,
    COUNT(DISTINCT s.id) AS total_active_subscriptions,
    COALESCE(SUM(CASE WHEN i.due_date <= CURRENT_TIMESTAMP AND i.status != 'paid' THEN i.amount ELSE 0 END), 0) AS total_overdue_amount,
    COALESCE(SUM(CASE WHEN i.paid_at >= date('now', 'start of day') THEN i.amount ELSE 0 END), 0) AS collected_today,
    COALESCE(SUM(CASE WHEN i.handover_status = 'agent_custody' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS cash_in_agents_custody
FROM users u
LEFT JOIN subscriptions s ON s.distributor_id = u.id
LEFT JOIN installments i ON i.subscription_id = s.id
WHERE u.role = 'distributor'
GROUP BY u.id
```

2. **`admin_portfolio_overview`**:
```sql
SELECT 
    'portfolio_summary' AS id,
    COALESCE(SUM(s.total_amount), 0) AS gross_portfolio_value,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS total_realized_cash,
    COALESCE(SUM(CASE WHEN i.due_date <= CURRENT_TIMESTAMP AND i.status != 'paid' THEN i.amount ELSE 0 END), 0) AS total_overdue_cash,
    COUNT(DISTINCT CASE WHEN s.travel_status IN ('scheduled', 'completed') AND i.status != 'paid' AND i.due_date <= CURRENT_TIMESTAMP THEN s.id END) AS post_travel_default_count,
    COALESCE(SUM(CASE WHEN i.handover_status = 'agent_custody' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS field_float
FROM subscriptions s
LEFT JOIN installments i ON i.subscription_id = s.id
```

## 4. PocketBase JavaScript Hooks (`pb_hooks`)

PocketBase runs scripts inside `pb_hooks/*.pb.js`.

### 4.1 Subscription Creation Hook (`01_subscriptions.pb.js`)
- Event: `onModelAfterCreate((e) => { ... }, "subscriptions")`
- Action:
  1. Retrieve `tenure_months` ($N$) and `total_amount`.
  2. Compute `monthly_amount = total_amount / N`.
  3. Parse `booking_date`.
  4. In a loop $i = 1 \dots N$, instantiate new `installments` records.
  5. Compute each `due_date = booking_date + (i * 30 or 1 month)`.
  6. Save each installment via `$app.dao().saveRecord(installment)`.

### 4.2 Installment Payment & Travel Unlock Hook (`02_installments.pb.js`)
- Event: `onModelAfterUpdate((e) => { ... }, "installments")`
- Action:
  1. Check if `e.model.getString("status") === "paid"`.
  2. Retrieve the parent subscription record via `subscription_id`.
  3. Query all installments for this subscription where `status = "paid"`.
  4. Count the paid records: `paidCount`.
  5. Update `subscription.set("paid_emis_count", paidCount)`.
  6. Retrieve `min_emis_to_travel` from the associated package.
  7. If `paidCount >= min_emis_to_travel` and `subscription.travel_status === "locked"`, update `travel_status` to `"eligible"`.
  8. Save subscription: `$app.dao().saveRecord(subscription)`.

### 4.3 Idempotency Guard Hook (`03_idempotency.pb.js`)
- Event: `onModelBeforeCreate((e) => { ... }, "installments")`
- Action:
  1. Check if `idempotency_key` is present on `e.model`.
  2. If present, query database for any existing record with that key:
     `$app.dao().findFirstRecordByData("installments", "idempotency_key", key)`.
  3. If match found, throw a `BadRequestError("Duplicate idempotency_key detected")`.

## 5. Security & Access Rules Matrix

| Collection | List/View Rule | Create Rule | Update Rule | Delete Rule |
|------------|----------------|-------------|-------------|-------------|
| `users` | `@request.auth.id != ""` (or scoped) | `@request.auth.role = 'admin'` | `@request.auth.id = id \|\| @request.auth.role = 'admin'` | `@request.auth.role = 'admin'` |
| `packages` | `is_active = true \|\| @request.auth.role = 'admin'` | `@request.auth.role = 'admin'` | `@request.auth.role = 'admin'` | `@request.auth.role = 'admin'` |
| `subscriptions` | `@request.auth.role = 'admin' \|\| (@request.auth.role = 'distributor' && distributor_id = @request.auth.id) \|\| (@request.auth.role = 'agent' && agent_id = @request.auth.id)` | `@request.auth.role = 'admin' \|\| @request.auth.role = 'agent'` | `@request.auth.role = 'admin'` | `@request.auth.role = 'admin'` |
| `installments` | `@request.auth.role = 'admin' \|\| (@request.auth.role = 'distributor' && subscription_id.distributor_id = @request.auth.id) \|\| (@request.auth.role = 'agent' && subscription_id.agent_id = @request.auth.id)` | `@request.auth.role = 'admin'` (auto-generated by hooks) | `@request.auth.role = 'admin' \|\| (@request.auth.role = 'agent' && subscription_id.agent_id = @request.auth.id && handover_status != 'distributor_confirmed')` | `@request.auth.role = 'admin'` |
| `cash_handovers` | `@request.auth.role = 'admin' \|\| agent_id = @request.auth.id \|\| distributor_id = @request.auth.id` | `@request.auth.role = 'agent'` | `@request.auth.role = 'distributor' \|\| @request.auth.role = 'admin'` | `@request.auth.role = 'admin'` |

## 6. Validation Architecture

Automated verification will be executed via a standalone Node.js integration script `tests/phase1_verification.js` using native `fetch` against the local PocketBase server:
1. **Health & Schema check:** Ensure PocketBase `/api/health` returns 200 and all 5 collections exist in `/api/collections`.
2. **Seed accounts & package:** Create test admin, distributor, agent, and package.
3. **Hook verification 1 (Installment Generation):** Create a 6-month subscription for Rs. 30,000. Verify that 6 installments are automatically created with `amount = 5000`.
4. **Hook verification 2 (Travel Unlock):** Mark 2 installments as `paid`. Verify `paid_emis_count = 2` and `travel_status` transitions from `locked` to `eligible`.
5. **Hook verification 3 (Idempotency):** Attempt to insert an installment with an existing `idempotency_key`. Verify request fails with HTTP 400.
6. **Security check (Agent Isolation):** Agent 2 attempts to fetch Agent 1's subscriptions; verify HTTP 403 or empty list.
7. **Security check (Handover Finality):** Agent attempts to update an installment with `handover_status = 'distributor_confirmed'`; verify rejection.
8. **View check:** Query `distributor_daily_analytics` and `admin_portfolio_overview`; verify aggregated metrics match expected values.

## 7. Risks & Mitigations

- **Risk:** Port conflict on default PocketBase port `8090`.
  - **Mitigation:** Allow configuring `--http=127.0.0.1:8090` or custom port.
- **Risk:** SQLite database lock during concurrent hook executions.
  - **Mitigation:** PocketBase uses SQLite with WAL mode by default; wrap multi-record updates in transactions or rely on Dao transactional methods.
- **Risk:** Timezone offset differences in due_date rolling intervals.
  - **Mitigation:** Use UTC ISO strings format (`YYYY-MM-DD 12:00:00.000Z`).
