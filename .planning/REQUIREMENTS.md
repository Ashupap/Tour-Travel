# Requirements: BharatYatra PWA

**Defined:** 2026-09-21
**Core Value:** An agent in a village with no internet must be able to collect an EMI, print a receipt, and sync it to the server the moment connectivity returns — zero data loss, zero duplicate entries.

## v1 Requirements

### Data Schema (DAT)

- [ ] **DAT-01**: System provides a `users` auth collection with role (admin, distributor, agent), phone, distributor_id relation, commission_percentage, and is_active flag
- [ ] **DAT-02**: System provides a `packages` collection with title, destination, duration_days, total_price, allowed_tenures (JSON array), min_emis_to_travel, cover_image, itinerary, and is_active
- [ ] **DAT-03**: System provides a `subscriptions` collection with auto-generated booking_code, customer info, package/agent/distributor relations, tenure_months, total_amount, monthly_emi_amount, paid_emis_count, and travel_status (locked/eligible/scheduled/completed)
- [ ] **DAT-04**: System provides an `installments` collection with installment_no, due_date, amount, status (pending/paid/overdue), paid_at, collected_by, payment_mode (cash/upi), handover_status (agent_custody/distributor_confirmed), receipt_slip_id, and idempotency_key
- [ ] **DAT-05**: System provides a `cash_handovers` collection with agent_id, distributor_id, total_amount, installments_covered (multi-relation), otp_code, status (initiated/verified/rejected), and verified_at
- [ ] **DAT-06**: System creates a `distributor_daily_analytics` SQLite view aggregating total_active_subscriptions, total_overdue_amount, collected_today, and cash_in_agents_custody per distributor
- [ ] **DAT-07**: System creates an `admin_portfolio_overview` SQLite view for gross portfolio value, realized cash, overdue cash, post-travel defaults, and field float

### Hooks & Automation (HOOK)

- [ ] **HOOK-01**: On subscription creation, system auto-inserts N installments (N = tenure_months) with amount = total_amount / tenure_months and rolling monthly due_dates
- [ ] **HOOK-02**: On installment status update to 'paid', system recalculates paid_emis_count and sets subscription travel_status to 'eligible' if paid_emis_count >= package.min_emis_to_travel
- [ ] **HOOK-03**: System rejects batch-sync records where idempotency_key already exists in the database (idempotent writes)

### API Endpoints (API)

- [ ] **API-01**: POST /api/agent/batch-sync accepts a bundle of offline-collected installment payments, verifies idempotency keys, and commits all records atomically in a single DB transaction
- [ ] **API-02**: GET /api/agent/sync-manifest returns the morning manifest of all subscribers and pending installments assigned to the authenticated agent
- [ ] **API-03**: POST /api/handover/initiate computes all agent_custody installments for the agent, generates a 4-digit OTP, and creates a cash_handovers record in 'initiated' status
- [ ] **API-04**: POST /api/handover/verify accepts the distributor-submitted OTP, validates it against the initiated handover, and transitions all linked installments to distributor_confirmed

### Landing Page (LAND)

- [ ] **LAND-01**: Public landing page hero section renders a Three.js r128 3D luxury sleeper bus canvas that animates along a spline curve as the user scrolls
- [ ] **LAND-02**: Public landing page includes a dynamic EMI calculator where customers select a package and tenure to see monthly EMI amount
- [ ] **LAND-03**: Package catalog grid displays tour packages with Vanilla-Tilt.js 3D tilt effect (glare: true, maxGlare: 0.35, speed: 400)
- [ ] **LAND-04**: "Check Booking Status" modal allows customers to enter their phone number or booking code without logging in and receive an HTMX-rendered golden Travel Eligibility Pass
- [ ] **LAND-05**: Travel Eligibility Pass includes a downloadable payment history / receipt slips list

### Agent Dashboard (AGNT)

- [ ] **AGNT-01**: Agent mobile dashboard displays today's recovery list (subscribers with pending installments due) with per-installment "Collect Rs.X" buttons
- [ ] **AGNT-02**: Tapping "Collect" opens an HTMX modal for selecting payment mode (cash/UPI) and confirming collection
- [ ] **AGNT-03**: Agent dashboard displays current offline sync state (online/offline indicator, count of unsynced records) and a "Sync Data" button
- [ ] **AGNT-04**: After collecting a payment, agent can open a printable thermal-receipt modal and share a WhatsApp deeplink (wa.me URL with receipt summary)
- [ ] **AGNT-05**: Agent dashboard shows a "Cash in Hand" total card and a "Handover to Distributor" button that initiates the OTP handover flow

### Distributor Dashboard (DIST)

- [ ] **DIST-01**: Distributor dashboard displays aggregated recovery metrics (total collected today, total overdue, total subscriptions) for their territory
- [ ] **DIST-02**: Distributor dashboard shows a "Pending Handovers" panel listing initiated handover requests from subordinate agents with an OTP input field to verify
- [ ] **DIST-03**: Distributor dashboard includes a subordinate agent performance table (agent name, collections today, cash in hand, overdue accounts)
- [ ] **DIST-04**: Distributor can view delinquent account warnings (installments overdue by > 30 days)

### Admin Dashboard (ADMN)

- [ ] **ADMN-01**: Admin dashboard shows portfolio health metrics: Total Booked Value, Total Realized Cash, Total Defaults, Cash in Transit (field float)
- [ ] **ADMN-02**: Admin dashboard shows a post-travel default risk watchlist (customers with travel_status in scheduled/completed who have >= 1 overdue installment)
- [ ] **ADMN-03**: Admin can perform CRUD operations on packages (title, price, tenures, cover image, itinerary, active status) via a package manager UI
- [ ] **ADMN-04**: Admin can export a bus manifest (CSV/printable) of all passengers scheduled for a specific tour with their payment status

### PWA & Offline Engine (PWA)

- [ ] **PWA-01**: App includes a manifest.json configured for standalone display mode, with app name, theme colors, icons (192x192, 512x512), and start_url
- [ ] **PWA-02**: Service Worker (sw.js) implements cache-first strategy for static assets (HTMX, Alpine.js, Three.js, Tailwind CSS, fonts)
- [ ] **PWA-03**: Service Worker registers a Background Sync event ('sync-installments') that fires POST /api/agent/batch-sync when connectivity is restored
- [ ] **PWA-04**: offline-store.js uses Dexie.js to define an IndexedDB schema with tables: packages, subscriptions, installments, and outbox (pending sync queue)
- [ ] **PWA-05**: Agent app downloads and stores the morning manifest into Dexie.js on manual sync trigger

### Security & Access Control (SEC)

- [ ] **SEC-01**: PocketBase collection rules ensure agents can only list/view subscriptions and installments where agent_id = @request.auth.id
- [ ] **SEC-02**: PocketBase collection rules prevent agents from updating installments where handover_status = 'distributor_confirmed'
- [ ] **SEC-03**: PocketBase collection rules ensure distributors can only view subscriptions/agents where distributor_id = @request.auth.id
- [ ] **SEC-04**: All custom API endpoints validate the requesting user's role before processing

## v2 Requirements

### Payments

- **PAY-01**: Online payment gateway integration (Razorpay/PhonePe) for direct EMI collection
- **PAY-02**: UPI QR code generation per installment for agent-presented collection

### Notifications

- **NOTF-01**: WhatsApp Business API integration for automated EMI due-date reminders to customers
- **NOTF-02**: Agent receives push notification when new subscriber is assigned

### Localization

- **L10N-01**: Full Hindi language support via i18n system

### Enhanced Analytics

- **ANLT-01**: Date-range filtering on distributor analytics
- **ANLT-02**: Agent commission auto-calculation and disbursement tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS/Android app | PWA with standalone display is sufficient for field use; reduces distribution friction |
| Real-time push notifications (WebSocket) | Not reliable on 2G/3G; WhatsApp is the agent communication model |
| Online payment gateway (v1) | Cash+UPI only; Razorpay etc. is a v2 enhancement |
| Multi-language i18n (v1) | Hindi + English in UI text sufficient for v1 |
| Seat selection / booking calendar | Admin does seat allotment manually via bus manifest export in v1 |
| Customer mobile app | Customers interact via public landing page + booking-status modal only |
| Email notifications | Phone/WhatsApp is the communication medium in this market |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DAT-01 | Phase 1 | Pending |
| DAT-02 | Phase 1 | Pending |
| DAT-03 | Phase 1 | Pending |
| DAT-04 | Phase 1 | Pending |
| DAT-05 | Phase 1 | Pending |
| DAT-06 | Phase 1 | Pending |
| DAT-07 | Phase 1 | Pending |
| HOOK-01 | Phase 1 | Pending |
| HOOK-02 | Phase 1 | Pending |
| HOOK-03 | Phase 1 | Pending |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 2 | Pending |
| LAND-01 | Phase 3 | Pending |
| LAND-02 | Phase 3 | Pending |
| LAND-03 | Phase 3 | Pending |
| LAND-04 | Phase 3 | Pending |
| LAND-05 | Phase 3 | Pending |
| PWA-01 | Phase 2 | Pending |
| PWA-02 | Phase 2 | Pending |
| PWA-03 | Phase 2 | Pending |
| PWA-04 | Phase 2 | Pending |
| PWA-05 | Phase 2 | Pending |
| AGNT-01 | Phase 2 | Pending |
| AGNT-02 | Phase 2 | Pending |
| AGNT-03 | Phase 2 | Pending |
| AGNT-04 | Phase 2 | Pending |
| AGNT-05 | Phase 2 | Pending |
| DIST-01 | Phase 3 | Pending |
| DIST-02 | Phase 3 | Pending |
| DIST-03 | Phase 3 | Pending |
| DIST-04 | Phase 3 | Pending |
| ADMN-01 | Phase 4 | Pending |
| ADMN-02 | Phase 4 | Pending |
| ADMN-03 | Phase 4 | Pending |
| ADMN-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-21*
*Last updated: 2026-09-21 after initialization*
