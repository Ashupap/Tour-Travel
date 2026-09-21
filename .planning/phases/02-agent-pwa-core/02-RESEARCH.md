# Phase 02: Agent PWA Core — Technical Research

**Date:** 2026-09-21
**Scope:** PocketBase Custom API Routes, Dexie.js Offline Architecture, Service Worker Sync, Agent PWA UI

## 1. Custom API Endpoints Architecture (`pb_hooks/04_agent_api.pb.js`)

PocketBase v0.22 supports custom routes via the global `routerAdd(method, path, handler)` function in `pb_hooks/`.

### 1.1 Authentication & Role Validation (SEC-04)
PocketBase provides `$apis.requestInfo(c).authRecord` to inspect the authenticated record:
```javascript
function requireRole(c, allowedRoles) {
  const info = $apis.requestInfo(c);
  const auth = info.authRecord;
  if (!auth) {
    throw new UnauthorizedError("Authentication required");
  }
  const role = auth.getString("role");
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError(`Forbidden: requires one of [${allowedRoles.join(", ")}]`);
  }
  return auth;
}
```

### 1.2 Morning Manifest Sync Endpoint (`GET /api/agent/sync-manifest`)
- **Requirement:** API-02
- **Logic:**
  1. Authenticate agent.
  2. Query `subscriptions` where `agent_id = auth.id`.
  3. Query `installments` linked to those subscriptions where `status IN ('pending', 'overdue')`.
  4. Query active `packages` reference data.
  5. Return JSON: `{ subscriptions, installments, packages, synced_at }`.

### 1.3 Atomic Batch Collection Sync Endpoint (`POST /api/agent/batch-sync`)
- **Requirement:** API-01, HOOK-03
- **Payload:**
  ```json
  {
    "items": [
      {
        "installment_id": "inst_123",
        "payment_mode": "cash",
        "paid_at": "2026-09-21 15:30:00.000Z",
        "receipt_slip_id": "OFF-agent_1-1726941234",
        "idempotency_key": "agent_1-inst_123-1726941234"
      }
    ]
  }
  ```
- **Transaction Handling:**
  Wrap batch processing in `$app.dao().runInTransaction((txDao) => { ... })`:
  1. For each item, check if `idempotency_key` already exists.
  2. If already processed, add to `skipped_duplicates` list (do not abort batch).
  3. If new, update installment:
     - `status = 'paid'`
     - `payment_mode = item.payment_mode`
     - `paid_at = item.paid_at`
     - `receipt_slip_id = item.receipt_slip_id`
     - `idempotency_key = item.idempotency_key`
     - `collected_by = auth.id`
     - `handover_status = 'agent_custody'`
     - Save record using `txDao.saveRecord(record)`.
  4. Return summary: `{ processed_count, skipped_count, results }`.

### 1.4 Cash Handover Endpoints (`POST /api/handover/initiate` & `verify`)
- **Requirements:** API-03, API-04
- **Initiation (`/api/handover/initiate`):**
  1. Query all installments where `collected_by = auth.id && payment_mode = 'cash' && handover_status = 'agent_custody' && status = 'paid'`.
  2. Sum total cash.
  3. Generate 4-digit OTP: `String(Math.floor(1000 + Math.random() * 9000))`.
  4. Fetch agent's `distributor_id`.
  5. Create `cash_handovers` record in `status = 'initiated'` with list of installment IDs.
  6. Return `{ handover_id, total_amount, otp_code, count }`.
- **Verification (`/api/handover/verify`):**
  1. Authenticate distributor.
  2. Look up `cash_handovers` record by ID.
  3. Validate `handover.distributor_id === auth.id` and `handover.otp_code === input_otp`.
  4. Transition handover record to `status = 'verified'`, set `verified_at = now()`.
  5. Transition all covered installments to `handover_status = 'distributor_confirmed'`.

## 2. Offline-First Storage Architecture (Dexie.js)

### 2.1 Dexie Database Definition (`pb_public/offline-store.js`)
```javascript
const db = new Dexie("BharatYatraDB");
db.version(1).stores({
  packages: "id, title, min_emis_to_travel",
  subscriptions: "id, booking_code, customer_name, customer_phone, agent_id, travel_status",
  installments: "id, subscription_id, installment_no, due_date, amount, status, handover_status, idempotency_key",
  outbox: "++local_id, installment_id, subscription_id, amount, payment_mode, receipt_slip_id, idempotency_key, collected_at, sync_status"
});
```

### 2.2 Offline Collection Operation
When agent collects offline:
1. Update local `installments` record: `status = 'paid'`, `handover_status = 'agent_custody'`.
2. Generate slip ID: `OFF-${agentId}-${Date.now()}`.
3. Insert entry into `outbox` table with `sync_status = 'pending_push'`.
4. Register background sync tag: `navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-installments'))`.
5. Trigger receipt modal display.

## 3. Service Worker Sync Strategy (`pb_public/sw.js`)

1. **Pre-caching & Cache-First:**
   Cache static shell assets (`/agent/dashboard`, `/css/tailwind.css`, `/js/dexie.min.js`, `/offline-store.js`, icons).
2. **Background Sync Lifecycle:**
   - Listen to `self.addEventListener('sync', event => { if (event.tag === 'sync-installments') event.waitUntil(flushOutbox()); })`.
   - On online trigger, reads all `pending_push` records from Dexie `outbox`, sends bundle to `POST /api/agent/batch-sync`, updates `outbox` records to `synced`, and posts a message to client windows to refresh UI state.

## 4. Monospaced Thermal Receipt & WhatsApp Integration

### 4.1 Monospaced Receipt Format
Monospaced 58mm POS receipt layout:
```text
================================
         BHARAT YATRA
    Official Collection Slip
================================
Receipt:  OFF-agnt1-1726941234
Date:     2026-09-21 15:30 IST
--------------------------------
Customer: Amit Verma
Booking:  BY-2026-98X2
Tour:     Char Dham Yatra Deluxe
EMI No:   1 of 6
--------------------------------
AMOUNT PAID:        Rs. 6,000.00
Payment Mode:               CASH
Status:        COLLECTED (OFFLINE)
Agent:             Ramesh Sharma
================================
  Save Paper • Travel Bharat
================================
```

### 4.2 WhatsApp Share Deeplink
`https://wa.me/91${phone}?text=${encodedReceiptText}`
Allows the agent to instantly tap "Share on WhatsApp" to deliver an immediate proof of payment directly to the passenger's mobile phone without internet connectivity (stored in SMS/WhatsApp draft until signal returns).
