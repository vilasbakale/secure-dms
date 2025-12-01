#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# Project directory
PROJECT_DIR="/home/vilas/Secure_DMS"
BACKUP_DIR="/home/vilas/Secure_DMS_App_Backups"

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/Secure_DMS_App_P1_${TIMESTAMP}.tar.gz"

echo "Creating application backup..."
echo "Source: $PROJECT_DIR"
echo "Destination: $BACKUP_FILE"

tar --exclude="postgres_data" \
    --exclude="Secure_DMS_Storage" \
    --exclude="node_modules" \
    --exclude="**/node_modules" \
    -czf "$BACKUP_FILE" -C "/home/vilas" "Secure_DMS"

echo "Backup complete."
echo "Saved at: $BACKUP_FILE"
