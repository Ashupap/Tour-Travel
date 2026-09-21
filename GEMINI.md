# BharatYatra PWA — Project Guide

## Project

BharatYatra PWA: Offline-first EMI-based bus tourism micro-collection system. Built on PocketBase (Go), HTMX, Alpine.js, Three.js, Dexie.js.

See `.planning/PROJECT.md` for full context and requirements.

## GSD Workflow

This project uses the Get-Shit-Done (GSD) agentic workflow.

### Key Commands

- `/gsd-progress` — Check current phase and next steps
- `/gsd-plan-phase 1` — Plan the current phase in detail
- `/gsd-execute-phase 1` — Execute a planned phase
- `/gsd-verify-work` — Verify current phase deliverables

### Current State

See `.planning/STATE.md` for current phase and plan status.

### Roadmap

See `.planning/ROADMAP.md` for all phases, plans, and success criteria.

## Tech Stack Rules

- **Backend:** PocketBase v0.22+ — Go custom routes, pb_hooks (JavaScript), SQLite WAL
- **Templates:** Go `html/template` served by PocketBase custom routes — NOT a separate web server
- **Frontend dynamics:** HTMX v2.x for dynamic swaps, Alpine.js v3.x for client-side state
- **3D visuals:** Three.js r128 (CDN) — hero bus canvas only, not a full 3D game engine
- **Offline:** Dexie.js + Service Worker Background Sync — no polling, no websocket for sync
- **Styling:** Tailwind CSS (standalone CLI pre-built) — no React, no npm build pipeline
- **No:** React, Vue, Next.js, GraphQL, external databases, or native app code

## Coding Standards

- All pb_hooks logic goes in `pb_hooks/` directory as `.pb.js` files
- Go custom route handlers go in `main.go` or `routes/` package
- Templates go in `templates/` directory with subdirectories per role (public, agent, distributor, admin)
- Service Worker and offline store go in `pb_public/` (served as static files)
- Use `idempotency_key` checks on ALL sync writes — never skip
- Access rules: ALWAYS scope agents to `agent_id = @request.auth.id`, distributors to `distributor_id = @request.auth.id`

## Key Business Rules

1. **Installment generation:** Created automatically on subscription creation via pb_hooks — never create manually
2. **Travel unlock:** Automatic when `paid_emis_count >= package.min_emis_to_travel` — do not update travel_status manually
3. **Handover finality:** Once `handover_status = distributor_confirmed`, installment is immutable — enforce at rule level
4. **Offline sync:** All agent collection writes must include a unique `idempotency_key` (format: `{agent_id}-{installment_id}-{timestamp}`)
5. **Receipt IDs:** Format `SLIP-YYYYMM-XXXX` (online) or `OFF-{agent_id}-{timestamp}` (offline)

## File Structure (Target)

```
bharatyatra/
├── main.go                    # PocketBase app entry point + custom routes
├── routes/                    # Custom route handlers
│   ├── agent.go
│   ├── handover.go
│   └── public.go
├── pb_hooks/                  # PocketBase JavaScript hooks
│   ├── subscription_hooks.pb.js
│   └── installment_hooks.pb.js
├── templates/                 # Go html/template files
│   ├── layout.html
│   ├── public/
│   │   ├── index.html
│   │   └── eligibility_pass.html
│   ├── agent/
│   │   └── dashboard.html
│   ├── distributor/
│   │   └── dashboard.html
│   └── admin/
│       └── dashboard.html
├── pb_public/                 # Static files served by PocketBase
│   ├── manifest.json
│   ├── sw.js
│   ├── offline-store.js
│   ├── css/
│   │   └── tailwind.css
│   └── 3d/
│       └── bus.glb            # <= 1.8MB compressed
├── pb_migrations/             # PocketBase migration files
│   └── 001_initial_schema.go
└── .planning/                 # GSD planning artifacts
    ├── PROJECT.md
    ├── REQUIREMENTS.md
    ├── ROADMAP.md
    ├── STATE.md
    └── config.json
```
