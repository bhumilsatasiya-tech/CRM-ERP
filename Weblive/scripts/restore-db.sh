#!/usr/bin/env bash
###############################################################################
# restore-db.sh <path-to-dump.sql.gz>
#
# DANGER — fully overwrites the production database. Confirms twice.
# Use case: rolling back to last night's snapshot after a bad deploy.
###############################################################################

set -euo pipefail

DUMP_FILE="${1:-}"
DB_NAME="${DB_NAME:-crm_erp_prod}"
DB_USER="${DB_USER:-crm_erp_app}"

if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
    echo "Usage: $0 <path-to-dump.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /var/backups/crm-erp/*.sql.gz 2>/dev/null | tail -10
    exit 1
fi

APP_ENV=/var/www/crm-erp/backend/.env
DB_PASS=$(grep '^DB_PASSWORD=' "$APP_ENV" | cut -d= -f2- | tr -d '"' | tr -d "'")

echo "==============================================================="
echo "  DESTRUCTIVE: this will REPLACE all data in $DB_NAME"
echo "  Source:  $DUMP_FILE"
echo "  Created: $(stat -c %y "$DUMP_FILE")"
echo "  Size:    $(du -h "$DUMP_FILE" | cut -f1)"
echo "==============================================================="
read -rp "Type 'RESTORE' (uppercase) to confirm: " yn
[[ "$yn" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

echo "==> Putting Laravel into maintenance mode"
sudo -u deploy php /var/www/crm-erp/backend/artisan down --retry=60 || true

echo "==> Restoring"
gunzip -c "$DUMP_FILE" | MYSQL_PWD="$DB_PASS" mysql --user="$DB_USER" --host=127.0.0.1 "$DB_NAME"

echo "==> Clear Laravel caches (stale data possible)"
sudo -u deploy php /var/www/crm-erp/backend/artisan cache:clear
sudo -u deploy php /var/www/crm-erp/backend/artisan config:cache

echo "==> Restart queue workers"
sudo supervisorctl restart crm-queue:*

echo "==> Bringing app back up"
sudo -u deploy php /var/www/crm-erp/backend/artisan up

echo "==============================================================="
echo "  Restore complete. Verify with a smoke test before announcing."
echo "==============================================================="
