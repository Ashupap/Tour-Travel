# BharatYatra PWA — Ubuntu Server Production Deployment Guide (Cloudflare Tunnel)

This guide covers production deployment of **BharatYatra PWA** (Aditya Travels) on **Ubuntu Server (20.04 / 22.04 / 24.04 LTS)** using PocketBase v0.22.55, Systemd, and **Cloudflare Tunnel** (`cloudflared`).

---

## 1. Architecture Overview (Zero Open Inbound Ports)

With Cloudflare Tunnel, **no Nginx reverse proxy, port forwarding, or Let's Encrypt setup is required**. PocketBase runs securely on `127.0.0.1:8090`, and an outbound encrypted tunnel connects your server to Cloudflare's global edge network.

```
                      ┌──────────────────────────────────────────────┐
                      │              Internet / Clients              │
                      │   Pilgrims · Sahayaks · Distributors · Admin │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTPS / HTTP/3
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │            Cloudflare Edge Network           │
                      │  - Automatic Managed SSL / TLS               │
                      │  - DDoS Protection & Global CDN              │
                      │  - WebSockets & Realtime SSE enabled         │
                      └──────────────────────┬───────────────────────┘
                                             │ Encrypted Outbound Tunnel
                                             │ (No Inbound Ports Needed!)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │           Ubuntu Production Server           │
                      │                                              │
                      │  ┌────────────────────────────────────────┐  │
                      │  │   cloudflared Service (Tunnel Daemon)  │  │
                      │  └───────────────────┬────────────────────┘  │
                      │                      │ http://localhost:8090 │
                      │                      ▼                       │
                      │  ┌────────────────────────────────────────┐  │
                      │  │       PocketBase v0.22.55 Daemon       │  │
                      │  │      (bharatyatra.service on 8090)     │  │
                      │  │                                        │  │
                      │  │  ├── pb_public/    (PWA & Static Web)  │  │
                      │  │  ├── pb_hooks/     (API & Business JS) │  │
                      │  │  ├── pb_migrations/(Database Schema)   │  │
                      │  │  └── pb_data/      (SQLite WAL DB)     │  │
                      │  └────────────────────────────────────────┘  │
                      └──────────────────────────────────────────────┘
```

---

## 2. Server Requirements

- **Operating System:** Ubuntu 20.04, 22.04, or 24.04 LTS (x86_64 or ARM64)
- **Minimum Specs:** 1 vCPU, 1 GB RAM, 10 GB SSD disk
- **Inbound Ports:** **None!** (0 inbound open ports required; no router port-forwarding needed)
- **Outbound Ports:** Port 443 (standard HTTPS outbound for Cloudflare tunnel connectivity)

---

## 3. Fast 1-Command Deployment

Once you have copied or cloned the repository to your Ubuntu server:

```bash
# 1. Navigate to the project directory
cd /var/www/bharatyatra  # or your destination path

# 2. Make scripts executable
chmod +x scripts/*.sh

# 3. Run the automated setup script
sudo bash scripts/setup-ubuntu.sh
```

### What `setup-ubuntu.sh` does automatically:
1. Detects system CPU architecture (`x86_64` or `arm64`).
2. Installs required system packages (`curl`, `unzip`, `wget`, `systemd`).
3. Downloads the official Linux binary for PocketBase **v0.22.55**.
4. Sets up application directory permissions (`700` for `pb_data`, `755` for public assets).
5. Creates, registers, and starts the **`bharatyatra.service`** systemd background service.
6. Verifies local service health on `http://127.0.0.1:8090/api/health`.

---

## 4. Manual Step-by-Step Installation (Alternative)

If you prefer to run each step manually:

### Step 1: Install System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl unzip wget ca-certificates systemd
```

### Step 2: Download PocketBase Linux Binary (v0.22.55)
```bash
cd /var/www/bharatyatra

# For x86_64 (Intel / AMD):
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.55/pocketbase_0.22.55_linux_amd64.zip
unzip pocketbase_0.22.55_linux_amd64.zip pocketbase
rm pocketbase_0.22.55_linux_amd64.zip
chmod +x pocketbase

# Check version
./pocketbase --version
# Expected: pocketbase version 0.22.55
```
*(For ARM64 / AWS Graviton, replace `linux_amd64` with `linux_arm64`).*

### Step 3: Configure File Permissions
```bash
sudo chown -R $USER:$USER /var/www/bharatyatra
chmod -R 755 pb_public pb_hooks pb_migrations
chmod -R 700 pb_data
```

### Step 4: Register Systemd Service
Create the service unit file:
```bash
sudo nano /etc/systemd/system/bharatyatra.service
```

Paste:
```ini
[Unit]
Description=BharatYatra PWA — PocketBase Service
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/bharatyatra
ExecStart=/var/www/bharatyatra/pocketbase serve --http=127.0.0.1:8090 --dir=/var/www/bharatyatra/pb_data --hooksDir=/var/www/bharatyatra/pb_hooks --migrationsDir=/var/www/bharatyatra/pb_migrations --publicDir=/var/www/bharatyatra/pb_public
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bharatyatra
LimitNOFILE=65535

# Security sandboxing
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```
*(Adjust `User=ubuntu` and `Group=ubuntu` to match your server's username).*

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable bharatyatra.service
sudo systemctl start bharatyatra.service

# Verify status:
sudo systemctl status bharatyatra.service
```

---

## 5. Exposing to the Public via Cloudflare Tunnel

Cloudflare Tunnel securely routes public traffic from your custom domain to `http://localhost:8090` without exposing any ports on your server.

### Step 1: Install `cloudflared` on Ubuntu
Run our helper script:
```bash
sudo bash scripts/install-cloudflared.sh
```
Or manually:
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb
```

### Step 2: Create Tunnel in Cloudflare Zero Trust
1. Log in to your [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. In the left navigation, go to **Networks** → **Tunnels**.
3. Click **Add a tunnel** → Choose **Cloudflared** → Name it (e.g., `bharatyatra-prod`).
4. Select your operating system (**Debian / Ubuntu**) and architecture (**64-bit**).
5. Cloudflare will give you an install command with your unique token:
   ```bash
   sudo cloudflared service install <YOUR_TUNNEL_TOKEN>
   ```
6. Paste and run that command on your Ubuntu server. The tunnel will connect instantly and run as an automatic system service!

### Step 3: Configure the Public Hostname
In the Cloudflare Tunnel configuration tab:
1. Click **Public Hostname** → **Add a public hostname**.
2. **Subdomain / Domain:** e.g., `travels.yourdomain.com` (or root `yourdomain.com`).
3. **Service Type:** Select **HTTP**.
4. **URL:** Enter `localhost:8090`.
5. Under **Additional application settings**:
   - In **HTTP Settings**, ensure **HTTP2 support** is enabled.
   - Real-time Server-Sent Events (SSE) and WebSockets work automatically over Cloudflare Tunnel.
6. Click **Save hostname**.

🎉 Your app is now live with automatic Cloudflare SSL, DDoS mitigation, and global CDN!

---

## 6. Service Management & Operations

| Task | Command |
| :--- | :--- |
| **Check App Status** | `sudo systemctl status bharatyatra` |
| **Restart App** | `sudo systemctl restart bharatyatra` |
| **Stop App** | `sudo systemctl stop bharatyatra` |
| **View Live Logs** | `sudo journalctl -u bharatyatra -f` |
| **View Recent Logs** | `sudo journalctl -u bharatyatra -n 50 --no-pager` |
| **Check Tunnel Status** | `sudo systemctl status cloudflared` |
| **View Tunnel Logs** | `sudo journalctl -u cloudflared -f` |
| **Test Local Health** | `curl -I http://127.0.0.1:8090/api/health` |

---

---

## 7. Development Test Users

The deployment automatically seeds standard test users into the SQLite database so you can log in immediately:

| Role | Email Identity | Password | Description |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@bharatyatra.local` | `password123456` | Master Administrator (Access to `/_/` & `/admin/`) |
| **Portal Admin** | `portaladmin@bharatyatra.local` | `password123456` | Operations Admin (`/admin/index.html`) |
| **Distributor** | `tarini_hub@bharatyatra.local` | `password123456` | Maa Tarini Hub Manager (`/distributor/index.html`) |
| **Field Sahayak** | `balaram_puri@bharatyatra.local` | `password123456` | Puri Route Agent (`/agent/index.html`) |

> You can also re-seed or verify these test accounts anytime by running:
> ```bash
> node scripts/seed-test-users.js
> ```

---

## 8. Continuous Deployment from Git (Pull & Redeploy)

Whenever you push modifications from your local development environment to GitHub, you can redeploy on Ubuntu in seconds:

### Option A: Manual 1-Command Redeploy
Run the master deploy script on the server:
```bash
cd /var/www/bharatyatra
sudo bash scripts/deploy.sh
```
This automatically:
1. Fetches latest commits from `origin/main`.
2. Hard-resets to remote HEAD without file merge conflicts.
3. Builds CSS bundles (`npm run build:css`) if needed.
4. Verifies permissions (`pb_data`, `pb_hooks`, `pb_public`).
5. Restarts the systemd daemon (`sudo systemctl restart bharatyatra`).
6. Ensures test users exist and verifies HTTP 200 health.

### Option B: Automatic Git Polling (Cron Auto-Deploy)
If you want the server to automatically check Git for new commits and redeploy without logging in:
```bash
sudo crontab -e
```
Add the following line to check Git every 5 minutes:
```cron
*/5 * * * * /bin/bash /var/www/bharatyatra/scripts/deploy.sh --auto >> /var/log/bharatyatra-autodeploy.log 2>&1
```
*(The `--auto` flag only performs a rebuild and restart if new commits actually exist on the remote repository).*

---

## 9. Automated Database Backups (Cron)

PocketBase includes built-in hot backup support for SQLite WAL databases.

### Run Manual Backup:
```bash
cd /var/www/bharatyatra
bash scripts/backup-db.sh
```
Archives are saved to `/var/www/bharatyatra/backups/`. Archives older than 14 days are automatically pruned.

### Set Up Automated Daily Backup:
```bash
sudo crontab -e
```
Add this entry to run backups daily at 2:00 AM:
```cron
0 2 * * * /bin/bash /var/www/bharatyatra/scripts/backup-db.sh >> /var/log/bharatyatra-backup.log 2>&1
```

---

## 9. PocketBase Admin UI

Once connected via Cloudflare Tunnel, you can access the PocketBase administrative control panel at:
`https://yourdomain.com/_/`
