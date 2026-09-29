# Plan 04-03 Summary: Bus Manifest Export (CSV + Printable Sheet)

## Requirements Covered
- ADMN-04, SEC-04

## Deliverables
- **Manifest API (`pb_hooks/09_admin_api.pb.js`)**:
  - `GET /api/admin/manifest?tour=<package_id>&format=json|csv` — aggregates one row per passenger (booking code, customer, phone, package, tenure, EMIs paid/total, amount paid, outstanding, travel status, last payment) plus `totals` (`amount_paid`, `outstanding`), `count`, `generated_at`. `400` without `tour`, `404` for unknown packages, in-handler `requireAdmin()` guard (`SEC-04`).
  - CSV response: RFC 4180 escaping (quotes doubled, formula-injection guard for leading `=+-@`), UTF-8 BOM prefix, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="manifest-<tour>-<date>.csv"` set via `c.response().header().set(...)`, body written with `c.blob(200, ...)`.
- **Manifest UI (`pb_public/admin/index.html` + `admin.js`)**: manifest tab with package select, **Preview** (JSON table), **Download CSV** (fetch → Blob → anchor download), and **Print** (dedicated `#manifest-print` sheet with `@media print` rules hiding the portal chrome).

## Verification
- Verified in `tests/phase4_verification.js` under `ADMN-04`: auth matrix, parameter validation, JSON manifest contents against a seeded passenger with a CSV-hostile name (`Sharma, "Ramesh" & Sons`), and CSV specifics — 200/text-csv, attachment filename, BOM bytes `EF BB BF`, exact header row, one row per passenger, quote escaping.
