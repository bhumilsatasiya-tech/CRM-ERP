#!/usr/bin/env bash
###############################################################################
# backup-db.sh — nightly MySQL backup
#
# Wire into cron:    15 2 * * * /usr/local/bin/crm-backup-db.sh
# Output:            /var/backups/crm-erp/YYYY-MM-DD.sql.gz
# Retention:         14 days (older files deleted)
#
# Off-server copy:   uncomment the rclone block below and configure a remote.
###############################################################################

set -euo pipefail

DB_NAME="${DB_NAME:-crm_erp_prod}"
DB_USER="${DB_USER:-crm_erp_app}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/crm-erp}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Read DB password from /var/www/crm-erp/backend/.env
APP_ENV=/var/www/crm-erp/backend/.env
if [[ ! -f "$APP_ENV" ]]; then
    echo "ERROR: $APP_ENV not found"
    exit 1
fi
DB_PASS=$(grep '^DB_PASSWORD=' "$APP_ENV" | cut -d= -f2- | tr -d '"' | tr -d "'")
if [[ -z "$DB_PASS" ]]; then
    echo "ERROR: could not read DB_PASSWORD from .env"
    exit 1
fi

DATE=$(date +%F)
TARGET="${BACKUP_DIR}/${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Dumping $DB_NAME → $TARGET"
MYSQL_PWD="$DB_PASS" mysqldump \
    --user="$DB_USER" \
    --host=127.0.0.1 \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --default-character-set=utf8mb4 \
    --set-gtid-purged=OFF \
    "$DB_NAME" \
    | gzip -9 > "$TARGET"

# Sanity check — gzip integrity
gzip -t "$TARGET"

# Permissions
chmod 600 "$TARGET"

# ---- Off-server copy --------------------------------------------------------
# Uncomment after `rclone config` is set up.
#
# RCLONE_REMOTE=myremote:crm-erp-backups
# rclone copy "$TARGET" "$RCLONE_REMOTE/" --quiet
# echo "[$(date)] Off-server copy → $RCLONE_REMOTE/$(basename "$TARGET")"

# ---- Retention --------------------------------------------------------------
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# Also include any storage files we care about. Comment out if storage lives on S3.
TARBALL="${BACKUP_DIR}/storage-${DATE}.tar.gz"
if [[ -d /var/www/crm-erp/backend/storage/app/public ]]; then
    tar -czf "$TARBALL" -C /var/www/crm-erp/backend/storage/app public 2>/dev/null
    chmod 600 "$TARBALL"
    find "$BACKUP_DIR" -name "storage-*.tar.gz" -mtime +${RETENTION_DAYS} -delete
fi

echo "[$(date)] Backup complete. Size: $(du -h "$TARGET" | cut -f1)"
