# Plan 01-02 Summary: PocketBase Collections Schema & Initial Migrations

**Phase:** 01 (Foundation & Data)
**Plan:** 02
**Status:** Completed
**Execution Date:** 2026-09-21
**Requirements Covered:** DAT-01, DAT-02, DAT-03, DAT-04, DAT-05

## Deliverables Completed
1. **Extended Users Auth Collection (`users`):** Added `role` (select: `admin`, `distributor`, `agent`), `phone` (text with unique index), `distributor_id` (relation), `commission_percentage` (number), and `is_active` (bool).
2. **Packages Base Collection (`packages`):** Created with `title`, `destination`, `duration_days`, `total_price`, `allowed_tenures` (json), `min_emis_to_travel` (default 2), `cover_image` (file), `itinerary` (editor), and `is_active`.
3. **Subscriptions Base Collection (`subscriptions`):** Created with `booking_code` (unique index), `customer_name`, `customer_phone`, `customer_address`, relations to `packages` and `users` (`agent_id`, `distributor_id`), `tenure_months`, `total_amount`, `monthly_emi_amount`, `paid_emis_count`, `travel_status` (`locked`, `eligible`, `scheduled`, `completed`), and `booking_date`.
4. **Installments Base Collection (`installments`):** Created with relation `subscription_id` (`cascadeDelete: true`), `installment_no`, `due_date`, `amount`, `status` (`pending`, `paid`, `overdue`), `paid_at`, `collected_by`, `payment_mode` (`cash`, `upi`), `handover_status` (`agent_custody`, `distributor_confirmed`), `receipt_slip_id` (unique index), and `idempotency_key` (index).
5. **Cash Handovers Base Collection (`cash_handovers`):** Created with relations to `users` (`agent_id`, `distributor_id`), `total_amount`, multi-relation to `installments` (`installments_covered`), `otp_code` (4 digits regex), `status` (`initiated`, `verified`, `rejected`), and `verified_at`.

## Verification
- Successfully applied `pb_migrations/1726940001_initial_schema.js` via `.\pocketbase.exe migrate up`.
- Database initialized and all 5 collections confirmed with relationships and constraints.
