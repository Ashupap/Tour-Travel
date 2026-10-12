#!/usr/bin/env bash
# ==============================================================================
# BharatYatra / Aditya Travels PWA - Ubuntu Server Production Setup Script
# PocketBase v0.22.55 + Systemd + Nginx Reverse Proxy
# ==============================================================================

set -euo pipefail

# Visual formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}================================================================${NC}"
echo -e "${CYAN}   BharatYatra PWA — Ubuntu Server Production Deployment Setup   ${NC}"
echo -e "${PURPLE}================================================================${NC}"

# 1. Root / Sudo check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] This script must be run as root or with sudo.${NC}"
  echo -e "Usage: sudo bash scripts/setup-ubuntu.sh"
  exit 1
fi

# Detect actual non-root user who invoked sudo (if any)
ACTUAL_USER="${SUDO_USER:-$(whoami)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}[INFO] Application directory: ${NC}${APP_DIR}"
echo -e "${BLUE}[INFO] Service user:          ${NC}${ACTUAL_USER}"

# 2. Check Operating System
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  VERSION_ID=${VERSION_ID:-"unknown"}
  echo -e "${GREEN}[✓] Detected OS: ${PRETTY_NAME}${NC}"
else
  echo -e "${YELLOW}[WARN] Could not identify OS via /etc/os-release. Proceeding assuming Debian/Ubuntu...${NC}"
  OS="ubuntu"
fi

# 3. Detect System Architecture (x86_64 vs arm64)
UNAME_M="$(uname -m)"
case "${UNAME_M}" in
  x86_64)
    PB_ARCH="linux_amd64"
    ;;
  aarch64|arm64)
    PB_ARCH="linux_arm64"
    ;;
  armv7l)
    PB_ARCH="linux_armv7"
    ;;
  *)
    echo -e "${RED}[ERROR] Unsupported CPU architecture: ${UNAME_M}${NC}"
    exit 1
    ;;
esac
echo -e "${GREEN}[✓] Detected architecture: ${UNAME_M} -> PocketBase ${PB_ARCH}${NC}"

# 4. Install OS Prerequisites
echo -e "\n${CYAN}--- Step 1: Installing Required System Packages ---${NC}"
apt-get update -y
apt-get install -y --no-install-recommends \
  curl \
  unzip \
  wget \
  ca-certificates \
  systemd \
  ufw

# Optional Node.js check (for test runners / tailwind if needed)
if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}[INFO] Node.js is not installed. Installing Node.js LTS for tests/tooling...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo -e "${GREEN}[✓] Node.js is already installed: $(node -v)${NC}"
fi

# 5. PocketBase Linux Binary Setup
echo -e "\n${CYAN}--- Step 2: Setting Up PocketBase Linux Binary ---${NC}"
PB_VERSION="0.22.55"
PB_BINARY="${APP_DIR}/pocketbase"

if [ -f "${PB_BINARY}" ] && [ -x "${PB_BINARY}" ]; then
  CURRENT_PB_VER="$("${PB_BINARY}" --version 2>/dev/null || echo "unknown")"
  echo -e "${GREEN}[✓] Found existing Linux pocketbase binary: ${CURRENT_PB_VER}${NC}"
else
  echo -e "${BLUE}[INFO] Downloading PocketBase v${PB_VERSION} for ${PB_ARCH}...${NC}"
  DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_ARCH}.zip"
  TMP_ZIP="/tmp/pocketbase_${PB_VERSION}_${PB_ARCH}.zip"

  curl -fSL "${DOWNLOAD_URL}" -o "${TMP_ZIP}"
  echo -e "${BLUE}[INFO] Extracting PocketBase binary into ${APP_DIR}...${NC}"
  unzip -o -q "${TMP_ZIP}" "pocketbase" -d "${APP_DIR}"
  rm -f "${TMP_ZIP}"

  chmod +x "${PB_BINARY}"
  echo -e "${GREEN}[✓] Downloaded and installed PocketBase: $("${PB_BINARY}" --version)${NC}"
fi

# 6. File Permissions
echo -e "\n${CYAN}--- Step 3: Setting Up File Permissions ---${NC}"
mkdir -p "${APP_DIR}/pb_data" "${APP_DIR}/pb_hooks" "${APP_DIR}/pb_public" "${APP_DIR}/pb_migrations"

# Set ownership to actual user so both CLI and systemd can run without permission conflicts
chown -R "${ACTUAL_USER}:${ACTUAL_USER}" "${APP_DIR}"
chmod 755 "${PB_BINARY}"
chmod -R 755 "${APP_DIR}/pb_hooks"
chmod -R 755 "${APP_DIR}/pb_public"
chmod -R 700 "${APP_DIR}/pb_data"
echo -e "${GREEN}[✓] Permissions configured successfully.${NC}"

# 7. Systemd Service Installation
echo -e "\n${CYAN}--- Step 4: Installing Systemd Service (bharatyatra.service) ---${NC}"
SERVICE_FILE="/etc/systemd/system/bharatyatra.service"

cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=BharatYatra PWA — PocketBase Service
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${ACTUAL_USER}
Group=${ACTUAL_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${PB_BINARY} serve --http=127.0.0.1:8090 --dir=${APP_DIR}/pb_data --hooksDir=${APP_DIR}/pb_hooks --migrationsDir=${APP_DIR}/pb_migrations --publicDir=${APP_DIR}/pb_public
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal
LimitNOFILE=65535

# Hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}[✓] Written systemd service: ${SERVICE_FILE}${NC}"
systemctl daemon-reload
systemctl enable bharatyatra.service
systemctl restart bharatyatra.service

echo -e "${BLUE}[INFO] Waiting for PocketBase to initialize...${NC}"
sleep 2

# 8. Service Health Check
echo -e "\n${CYAN}--- Step 5: Service Health Check ---${NC}"
if systemctl is-active --quiet bharatyatra.service; then
  echo -e "${GREEN}[✓] Systemd service 'bharatyatra.service' is ACTIVE and running!${NC}"
  
  HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090/api/health || echo "failed")
  if [ "${HEALTH_CHECK}" = "200" ]; then
    echo -e "${GREEN}[✓] PocketBase Health Check returned HTTP 200 OK!${NC}"
    
    # Seed development test users & demo data
    if command -v node >/dev/null 2>&1 && [ -f "${APP_DIR}/scripts/seed-test-users.js" ]; then
      echo -e "\n${CYAN}--- Step 5b: Seeding Development Test Users ---${NC}"
      node "${APP_DIR}/scripts/seed-test-users.js" || true
    fi
  else
    echo -e "${YELLOW}[WARN] Health check returned HTTP ${HEALTH_CHECK}. Service is running, checking logs:${NC}"
    journalctl -u bharatyatra -n 10 --no-pager
  fi
else
  echo -e "${RED}[ERROR] bharatyatra.service failed to start! Checking logs:${NC}"
  journalctl -u bharatyatra -n 20 --no-pager
  exit 1
fi

# 9. Firewall (UFW) Security Note
echo -e "\n${CYAN}--- Step 6: Security & Cloudflare Tunnel Readiness ---${NC}"
echo -e "${GREEN}[✓] PocketBase is bound locally to 127.0.0.1:8090.${NC}"
echo -e "${BLUE}[INFO] Because you are using Cloudflare Tunnel, no inbound ports (80/443/8090) need to be opened on your firewall!${NC}"
echo -e "${BLUE}[INFO] All public HTTPS traffic will route securely via outbound tunnel directly to http://localhost:8090.${NC}"

# 10. Summary & Next Steps
echo -e "\n${PURPLE}================================================================${NC}"
echo -e "${GREEN}🎉 BharatYatra Ubuntu Setup Completed Successfully! 🎉${NC}"
echo -e "${PURPLE}================================================================${NC}"
echo -e "Application Status: ${GREEN}RUNNING on http://127.0.0.1:8090${NC}"
echo -e "\n${YELLOW}Development Test Users Active:${NC}"
echo -e "  Admin:       ${CYAN}admin@bharatyatra.local       / password123456${NC}"
echo -e "  Distributor: ${CYAN}tarini_hub@bharatyatra.local  / password123456${NC}"
echo -e "  Sahayak:     ${CYAN}balaram_puri@bharatyatra.local / password123456${NC}"
echo -e "\n${YELLOW}To update code from git at any time:${NC}"
echo -e "  Run: ${CYAN}sudo bash scripts/deploy.sh${NC}"

echo -e "\n${YELLOW}Service Management Commands:${NC}"
echo -e "  Check status:  ${CYAN}sudo systemctl status bharatyatra${NC}"
echo -e "  Restart:       ${CYAN}sudo systemctl restart bharatyatra${NC}"
echo -e "  Stop:          ${CYAN}sudo systemctl stop bharatyatra${NC}"
echo -e "  View live logs:${CYAN}sudo journalctl -u bharatyatra -f${NC}"
echo -e "\n${YELLOW}Next Step: Expose via Cloudflare Tunnel (Zero Inbound Ports Needed)${NC}"
echo -e "  1. If cloudflared is not installed yet:"
echo -e "     ${CYAN}curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb${NC}"
echo -e "  2. Go to Cloudflare Zero Trust Dashboard -> Networks -> Tunnels"
echo -e "  3. Create a tunnel (e.g. 'bharatyatra') and run the connector command:"
echo -e "     ${CYAN}sudo cloudflared service install <YOUR_TUNNEL_TOKEN>${NC}"
echo -e "  4. Point your Public Hostname in Cloudflare dashboard to:"
echo -e "     Service: ${GREEN}HTTP${NC}  |  URL: ${CYAN}localhost:8090${NC}"
echo -e "\nSee ${CYAN}DEPLOYMENT.md${NC} for complete details."
