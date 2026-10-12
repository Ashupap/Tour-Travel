#!/usr/bin/env bash
# ==============================================================================
# Helper Script: Install and Configure Cloudflare Tunnel (cloudflared)
# Connects http://localhost:8090 to your Cloudflare domain with 0 open ports.
# ==============================================================================

set -euo pipefail

# Visual formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Cloudflare Tunnel (cloudflared) Installation ===${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run with sudo: sudo bash scripts/install-cloudflared.sh <TUNNEL_TOKEN (optional)>${NC}"
  exit 1
fi

# Detect architecture
UNAME_M="$(uname -m)"
case "${UNAME_M}" in
  x86_64)
    CF_ARCH="amd64"
    ;;
  aarch64|arm64)
    CF_ARCH="arm64"
    ;;
  *)
    CF_ARCH="amd64"
    ;;
esac

# 1. Download & Install cloudflared official Debian package
if ! command -v cloudflared >/dev/null 2>&1; then
  echo -e "${BLUE}[INFO] Downloading cloudflared for ${CF_ARCH}...${NC}"
  DEB_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}.deb"
  curl -fsSL "${DEB_URL}" -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
  echo -e "${GREEN}[✓] cloudflared installed successfully: $(cloudflared --version)${NC}"
else
  echo -e "${GREEN}[✓] cloudflared is already installed: $(cloudflared --version)${NC}"
fi

# 2. Check if a token was supplied as an argument
TUNNEL_TOKEN="${1:-}"

if [ -n "${TUNNEL_TOKEN}" ]; then
  echo -e "${BLUE}[INFO] Installing cloudflared system service with provided token...${NC}"
  cloudflared service install "${TUNNEL_TOKEN}"
  systemctl enable cloudflared
  systemctl restart cloudflared
  echo -e "${GREEN}[✓] Cloudflare Tunnel service is active and connected!${NC}"
else
  echo -e "\n${YELLOW}To connect your Cloudflare Tunnel to PocketBase:${NC}"
  echo -e "1. Go to your ${CYAN}Cloudflare Zero Trust Dashboard${NC} (https://one.dash.cloudflare.com/)"
  echo -e "2. Navigate to: ${CYAN}Networks -> Tunnels${NC}"
  echo -e "3. Click ${GREEN}'Create a tunnel'${NC} (select Cloudflared)"
  echo -e "4. Copy the install command token and run:"
  echo -e "   ${CYAN}sudo cloudflared service install <YOUR_TOKEN>${NC}"
  echo -e "5. Under Public Hostnames, set:"
  echo -e "   - Subdomain/Domain: ${GREEN}travels.yourdomain.com${NC}"
  echo -e "   - Type:             ${GREEN}HTTP${NC}"
  echo -e "   - URL:              ${GREEN}localhost:8090${NC}"
fi
