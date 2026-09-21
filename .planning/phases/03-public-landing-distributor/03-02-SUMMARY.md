# Plan 03-02 Summary: Package Catalog, Vanilla-Tilt & Dynamic EMI Calculator

## Deliverables
- **Vanilla-Tilt.js**: Bundled standalone at `pb_public/js/vanilla-tilt.min.js` (8.8 KB, local).
- **Tour Package Catalog (`pb_public/js/landing.js`)**:
  - Defined 4 premier religious/scenic circuits: Char Dham Yatra (Uttarakhand), Jyotirlinga Darshan Express (Gujarat/MP), South India Temple Circuit (Tamil Nadu/Kerala), Golden Temple & Himachal Explorer (Punjab/HP).
  - Configured total prices, durations, default allowed tenures (6, 9, 12 months), inclusions, and visual gradients.
- **Vanilla-Tilt 3D Cards (`LAND-03`)**:
  - Interactive cards with `max: 14`, `perspective: 1000`, and `glare: true` for responsive 3D parallax hover effect.
- **Dynamic Alpine.js EMI Calculator (`LAND-02`)**:
  - Interactive tenure selector (6, 9, 12 months).
  - Real-time monthly installment calculation (`Math.round(total / tenure)`).
  - Daily micro-savings equivalent metric (`Math.round(monthly / 30)`).
  - Progress bar dynamically visualizing the travel unlock threshold (`min_emis_to_travel` = 2 months).

## Verification
- Verified in `tests/phase3_verification.js` under `LAND-02` and `LAND-03`.
