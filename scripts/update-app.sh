#!/usr/bin/env bash
# ==============================================================================
# BharatYatra PWA — Production Application Update Script
# Wraps deploy.sh to pull latest code from git, build, verify users & restart.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/deploy.sh" "$@"
