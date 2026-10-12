#!/usr/bin/env bash
# ==============================================================================
# BharatYatra PWA — Production Zero-Downtime Application Update Script
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Pulling Latest Updates for BharatYatra PWA ==="
cd "${APP_DIR}"

# 1. Stash or pull git changes
if [ -d ".git" ]; then
  echo "[1/4] Pulling latest git repository updates..."
  git pull origin main || git pull
else
  echo "[1/4] Non-git installation. Skipping git pull."
fi

# 2. Build CSS if npm is available and files changed
if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
  echo "[2/4] Rebuilding production CSS bundle..."
  npm run build:css || true
fi

# 3. Reload / Restart PocketBase via Systemd
echo "[3/4] Reloading PocketBase systemd service..."
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart bharatyatra.service
  sleep 1
else
  echo "[WARN] systemctl not found. Please restart PocketBase process manually."
fi

# 4. Health Check
echo "[4/4] Verifying backend health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090/api/health || echo "fail")
if [ "${HEALTH}" = "200" ]; then
  echo "✓ BharatYatra is LIVE and healthy (HTTP 200 OK)!"
else
  echo "⚠ Warning: Health check returned HTTP ${HEALTH}. Check logs: journalctl -u bharatyatra -n 20"
fi
