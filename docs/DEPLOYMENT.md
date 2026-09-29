# BharatYatra — Deployment & Operations Guide

Copy-pasteable commands for taking this repo from a clean checkout to a production VPS
with HTTPS, backups, and a release checklist. Every command is written against this
repo's actual scripts and paths.

---

## 1. Build

```bash
git clone <your-repo-url> bharatyatra && cd bharatyatra
npm ci
npm run build          # = npm run build:css → minified pb_public/css/tailwind.css
```

Notes:

- `npm run build` only compiles Tailwind. The PocketBase binary is not built from source —
  download the matching release (v0.22.x) and place `pocketbase.exe` (Windows) or
  `pocketbase` (Linux/macOS) in the repo root.
- `npm run watch:css` rebuilds CSS on change during development.
- Static assets (`pb_public/**`) are served directly by PocketBase — no separate web server needed.

## 2. Runtime

First run (creates `pb_data/`, starts on port 8090):

```bash
npm run pb             # = pocketbase.exe serve --http=127.0.0.1:8090
```

First-run setup:

1. Open `http://127.0.0.1:8090/_/` and create the **superuser (admin UI)** account — this is
   PocketBase's own console, used for schema/backup management.
2. Create the application **admin user** in the `users` collection
   (`role = 'admin'`, e.g. `admin@bharatyatra.local`) — this account unlocks
   `GET /admin/dashboard` and every `/api/admin/*` endpoint.
3. Agent (`role = 'agent'`) and distributor (`role = 'distributor'`) accounts are created
   by operations staff through the distributor portal.

Verify a deploy:

```bash
node tests/phase1_verification.js
node tests/phase2_verification.js
node tests/phase3_verification.js
node tests/phase4_verification.js
```

The test suites spawn their own PocketBase instance on ports 8091-8099 — never run them
against the production process.

## 3. systemd (Linux VPS)

`/etc/systemd/system/bharatyatra.service`:

```ini
[Unit]
Description=BharatYatra PocketBase
After=network.target

[Service]
Type=simple
User=bharatyatra
Group=bharatyatra
WorkingDirectory=/opt/bharatyatra
ExecStart=/opt/bharatyatra/pocketbase serve --http=127.0.0.1:8090 --dir=/opt/bharatyatra/pb_data --hooksWatch=false
Restart=always
RestartSec=3
# pb_data permissions: owned by the service user only
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd --system --home /opt/bharatyatra --shell /usr/sbin/nologin bharatyatra
sudo mkdir -p /opt/bharatyatra
sudo chown -R bharatyatra:bharatyatra /opt/bharatyatra
# copy the repo (pocketbase, pb_hooks, pb_public, pb_migrations, pb_data) into /opt/bharatyatra
sudo chmod 700 /opt/bharatyatra/pb_data
sudo systemctl daemon-reload
sudo systemctl enable --now bharatyatra
sudo systemctl status bharatyatra
journalctl -u bharatyatra -f
```

PocketBase stays bound to `127.0.0.1:8090` — only the reverse proxy is public.

## 4. Caddy reverse proxy (automatic HTTPS)

`/etc/caddy/Caddyfile`:

```caddy
travel.example.com {
    # Security headers
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        -Server
    }

    # Basic request rate limiting (per-IP, 20 req/s burst 40)
    rate_limit {
        zone travel_default {
            key {remote_host}
            events 20
            window 1s
            burst 40
        }
    }

    # Tighter limit for auth endpoints
    @auth path /api/collections/*/auth-with-password /api/admins/auth-with-password
    handle @auth {
        rate_limit {
            zone travel_auth {
                key {remote_host}
                events 5
                window 10s
                burst 10
            }
        }
        reverse_proxy 127.0.0.1:8090
    }

    encode zstd gzip
    reverse_proxy 127.0.0.1:8090 {
        header_up X-Real-IP {remote_host}
    }
}
```

Notes:

- Rate limiting needs the `rate_limit` module (Caddy >= v2.8 built-in, or
  `caddy add-package github.com/mholt/caddy-ratelimit` for older builds). If you skip it,
  delete both `rate_limit` blocks — the header/handle blocks still work.
- PocketBase realtime (`/api/realtime`) needs WebSocket upgrade — `reverse_proxy` passes it through.
- Do **not** enable PocketBase's own HTTPS (`--https`) behind Caddy; keep one TLS terminator.

## 5. Backups

PocketBase v0.22 has **no CLI backup command** — backups are created through the admin
API (or the `/_/backups` UI), which produces a consistent zip of `pb_data` (database +
storage files).

Manual: open `/_/backups` → "Create backup" → download the zip.

Automated (cron) — `/opt/bharatyatra/scripts/backup.sh` (needs `curl`, `jq`):

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="http://127.0.0.1:8090"
# Store credentials in a root-owned env file, chmod 600
source /opt/bharatyatra/.backup.env          # PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD

TOKEN=$(curl -sf -X POST "$BASE/api/admins/auth-with-password" \
  -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$PB_ADMIN_EMAIL\",\"password\":\"$PB_ADMIN_PASSWORD\"}" | jq -r .token)

curl -sf -X POST "$BASE/api/backups" \
  -H "Authorization: $TOKEN" -H 'Content-Type: application/json' -d '{}' > /dev/null

KEY=$(curl -sf -H "Authorization: $TOKEN" "$BASE/api/backups" | jq -r '.items[0].key')
mkdir -p /opt/bharatyatra/backups
curl -sf -H "Authorization: $TOKEN" \
  "$BASE/api/backups/download/$KEY" -o "/opt/bharatyatra/backups/$KEY"

# Keep the newest 14 backups
ls -1t /opt/bharatyatra/backups/*.zip | tail -n +15 | xargs -r rm --
```

Daily cron (03:15):

```cron
15 3 * * * root /opt/bharatyatra/scripts/backup.sh >> /var/log/pb-backup.log 2>&1
```

Off-site: rsync the backups directory to a second host/object storage daily.

Restore procedure:

```bash
sudo systemctl stop bharatyatra
unzip -o /opt/bharatyatra/backups/<KEY>.zip -d /opt/bharatyatra/pb_data
sudo chown -R bharatyatra:bharatyatra /opt/bharatyatra/pb_data
sudo systemctl start bharatyatra
```

The zip's contents are the `pb_data` tree itself (e.g. `data.db`, `storage/`). Restoring
replaces live data — always test restores on staging first, and take a backup right
before a production restore.

## 6. Security checklist (maps to SEC-01..SEC-04)

- [ ] **Change every default credential** — PocketBase superuser created at `/_/`, the app
      admin account, and any seeded test users (the dev superuser
      `admin@bharatyatra.local` / `password123456` must never exist in production).
- [ ] **SEC-01 / SEC-03 (collection rules)** — `subscriptions` and `installments` list/view
      rules keep agent/distributor scoping (`agent_id`/`distributor_id =
      @request.auth.id`). Verify after any schema edit:
      `pb_migrations/1726940002_security_access_rules.js` is the source of truth; re-run
      `node tests/phase1_verification.js`.
- [ ] **SEC-02 (handover finality)** — `installments.updateRule` blocks changes once
      `handover_status = 'distributor_confirmed'`; covered by the phase 1 suite.
- [ ] **SEC-04 (role checks on custom endpoints)** — every `/api/admin/*`, `/api/agent/*`
      and `/api/distributor/*` hook validates the Bearer token role (401 anonymous, 403
      wrong role); covered by `tests/phase2..phase4_verification.js`.
- [ ] **`pb_data` permissions `700`**, owned by the service user — the SQLite DB and
      uploaded files (customer IDs, receipts) must not be world-readable.
- [ ] **Upload size limits** — image collections cap files at 5 MB (PocketBase settings →
      Files → "Max upload size", plus per-collection file limits); confirm in `/_/`.
- [ ] **TLS only** — HTTP is proxied to localhost; Caddy redirects HTTP→HTTPS.
- [ ] **Backups encrypted at rest** if they leave the host (they contain the full DB).

## 7. Release checklist

Run before **every** deploy:

1. `npm ci && npm run build` — Tailwind CSS compiles cleanly.
2. `node tests/phase1_verification.js` — schema, migrations, hooks, SEC-01..03.
3. `node tests/phase2_verification.js` — agent PWA APIs, offline sync, SEC-04.
4. `node tests/phase3_verification.js` — landing, distributor portal, DIST-01..04.
5. `node tests/phase4_verification.js` — admin portal, ADMN-01..04, SEC-04, 404 fallback.
6. `git status` clean, `git log` reviewed, version tag pushed.
7. Deploy `pb_hooks/`, `pb_public/`, `pb_migrations/` + new binary (if any); **do not**
   overwrite production `pb_data/`.
8. `sudo systemctl restart bharatyatra` and smoke-test:
   `/`, `/_/`, `/admin/dashboard`, `/agent/dashboard`, `/distributor/dashboard`,
   `GET /definitely-missing` (must be the branded 404).
9. Create a PocketBase backup right after deploy (point-in-time marker).

Rollback: redeploy the previous git tag, restore the pre-deploy backup if migrations ran.
