# Plan 03-03 Summary: Public Booking Status & Golden Travel Eligibility Pass

## Deliverables
- **Public API Endpoint (`pb_hooks/07_public_routes.pb.js`)**:
  - `GET /api/public/booking-status?query=<booking_code_or_phone>`.
  - Searches `subscriptions` by exact `booking_code` or `customer_phone`.
  - Returns structured JSON or HTMX HTML snippet depending on `HX-Request` header.
- **Golden VIP Travel Eligibility Pass (`LAND-04`)**:
  - Rendered with rich gold-amber gradient border, dark luxury backdrop, and glassmorphism styling.
  - Dynamic status indicator:
    - If `paid_emis_count < min_emis_to_travel`: "TRAVEL LOCKED (X/Y EMIs)" with countdown alert to unlock.
    - If `paid_emis_count >= min_emis_to_travel`: Glowing green-gold "ELIGIBLE TO TRAVEL" VIP boarding badge.
- **Complete Payment History & Receipt Slips (`LAND-05`)**:
  - Tabulated list of all tenure installments showing EMI number, amount, status (Paid / Pending / Overdue), due date, and verified digital slip ID (`SLIP-YYYYMM-XXXX`).
  - Print Pass button calling `window.print()` for physical verification at departure terminals.

## Verification
- Verified in `tests/phase3_verification.js` under `LAND-04` and `LAND-05`.
