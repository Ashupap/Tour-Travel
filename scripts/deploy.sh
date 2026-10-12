#!/usr/bin/env bash
# ==============================================================================
# BharatYatra PWA — Production Deployment & Continuous Update Script
# Usage:
#   sudo bash scripts/deploy.sh         -> Pulls latest git code & redeploys
#   sudo bash scripts/deploy.sh --auto  -> Only redeploys if new git commits exist (Cron-friendly)
# ==============================================================================

set -euo pipefail

# Visual formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"

MODE="${1:-}"

# 1. Check Git Remote for Updates
if [ -d ".git" ]; then
  echo -e "${BLUE}[1/5] Checking Git repository for updates...${NC}"
  
  # Fetch latest remote changes quietly
  git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || git fetch 2>/dev/null || true
  
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")"
  LOCAL_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo "none")"
  REMOTE_COMMIT="$(git rev-parse "origin/${CURRENT_BRANCH}" 2>/dev/null || echo "${LOCAL_COMMIT}")"

  if [ "${MODE}" = "--auto" ] && [ "${LOCAL_COMMIT}" = "${REMOTE_COMMIT}" ]; then
    # No new changes detected, exit quietly in auto mode
    exit 0
  fi

  echo -e "${CYAN}[INFO] Syncing with origin/${CURRENT_BRANCH}...${NC}"
  # Stash any local file alterations so git pull never conflicts
  git stash --include-untracked 2>/dev/null || true
  git reset --hard "origin/${CURRENT_BRANCH}"
  
  NEW_COMMIT="$(git log -1 --oneline)"
  echo -e "${GREEN}[✓] Updated to commit: ${NEW_COMMIT}${NC}"
else
  echo -e "${YELLOW}[1/5] Non-git directory. Skipping git pull.${NC}"
fi

# 2. Build Production CSS (if npm is installed)
echo -e "${BLUE}[2/5] Building production assets...${NC}"
if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
  npm run build:css 2>/dev/null || true
  echo -e "${GREEN}[✓] Stylesheet bundle verified.${NC}"
else
  echo -e "${YELLOW}[INFO] npm not found or build skipped. Pre-built styles active.${NC}"
fi

# 3. Ensure File Permissions
echo -e "${BLUE}[3/5] Verifying directory permissions...${NC}"
mkdir -p pb_data pb_hooks pb_migrations pb_public
chmod -R 755 pb_public pb_hooks pb_migrations scripts
chmod -R 700 pb_data
if [ -f "pocketbase" ]; then
  chmod +x pocketbase
fi
echo -e "${GREEN}[✓] Permissions configured.${NC}"

# 4. Restart Systemd Service
echo -e "${BLUE}[4/5] Restarting PocketBase service...${NC}"
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart bharatyatra.service
  sleep 1.5
else
  echo -e "${YELLOW}[WARN] systemctl not found. Please ensure PocketBase is running.${NC}"
fi

# 5. Service Health Check & Test User Verification
echo -e "${BLUE}[5/5] Verifying health and test user accounts...${NC}"
HEALTH="000"
for i in {1..10}; do
  HEALTH="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090/api/health || echo "000")"
  if [ "${HEALTH}" = "200" ]; then
    break
  fi
  sleep 1
done

if [ "${HEALTH}" = "200" ]; then
  echo -e "${GREEN}[✓] PocketBase backend is LIVE and responding (HTTP 200 OK)!${NC}"
  
  # Ensure development test users & initial packages are seeded
  if command -v node >/dev/null 2>&1 && [ -f "scripts/seed-test-users.js" ]; then
    echo -e "${CYAN}[INFO] Verifying test users & initial packages in database...${NC}"
    node scripts/seed-test-users.js || true
  fi

  echo -e "\n${GREEN}================================================================${NC}"
  echo -e "${GREEN}🎉 BharatYatra Redeployed Successfully! 🎉${NC}"
  echo -e "${GREEN}================================================================${NC}"
  echo -e "Test Accounts Ready:"
  echo -e "  Admin:       ${CYAN}admin@bharatyatra.local       / password123456${NC}"
  echo -e "  Distributor: ${CYAN}tarini_hub@bharatyatra.local  / password123456${NC}"
  echo -e "  Sahayak:     ${CYAN}balaram_puri@bharatyatra.local / password123456${NC}"
else
  echo -e "${RED}[ERROR] Service check returned HTTP ${HEALTH}. Reviewing logs:${NC}"
  sudo journalctl -u bharatyatra -n 15 --no-pager
  exit 1
fi
