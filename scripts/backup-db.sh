#!/usr/bin/env bash
# ==============================================================================
# BharatYatra PWA — Safe Online SQLite Database Backup Script
# Uses PocketBase's native backup CLI to generate hot snapshot archives.
# Can be scheduled in crontab (e.g. daily at 2:00 AM).
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${APP_DIR}/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_NAME="backup_${TIMESTAMP}.zip"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Running PocketBase native database backup..."
cd "${APP_DIR}"

# PocketBase native online backup command
./pocketbase backup create "${BACKUP_NAME}"

# Move to dedicated backups folder if created in default pb_data/backups
if [ -f "${APP_DIR}/pb_data/backups/${BACKUP_NAME}" ]; then
  mv "${APP_DIR}/pb_data/backups/${BACKUP_NAME}" "${BACKUP_DIR}/${BACKUP_NAME}"
fi

echo "[✓] Backup created successfully: ${BACKUP_DIR}/${BACKUP_NAME}"

# Keep last 14 daily backups, delete older ones
echo "[INFO] Cleaning up archives older than 14 days..."
find "${BACKUP_DIR}" -type f -name "backup_*.zip" -mtime +14 -exec rm {} + 2>/dev/null || true

echo "[✓] Backup routine complete."
