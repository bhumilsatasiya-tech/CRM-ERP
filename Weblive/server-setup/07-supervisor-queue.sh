#!/usr/bin/env bash
###############################################################################
# 07-supervisor-queue.sh
#
# Installs the Supervisor config for the Laravel queue worker, starts it,
# and wires the Laravel scheduler + reminder dispatch into cron.
###############################################################################

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: run with sudo"
    exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR=/var/www/crm-erp
BACKEND_DIR=$APP_DIR/backend

if [[ ! -f /home/$DEPLOY_USER/crm-queue.conf ]]; then
    echo "ERROR: ~/crm-queue.conf not found. SCP it first."
    exit 1
fi

echo "==> Install Supervisor program"
cp "/home/$DEPLOY_USER/crm-queue.conf" /etc/supervisor/conf.d/crm-queue.conf

supervisorctl reread
supervisorctl update
supervisorctl start crm-queue:* || true
sleep 2
supervisorctl status

echo ""
echo "==> Install crontab entries (scheduler + reminders + backup placeholder)"

# Capture current crontab (might be empty)
CRON_TMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TMP" || true

# Idempotent inserts
grep -q "schedule:run" "$CRON_TMP" || echo "* * * * * cd ${BACKEND_DIR} && /usr/bin/php artisan schedule:run >> /var/log/crm-scheduler.log 2>&1" >> "$CRON_TMP"
grep -q "reminders:dispatch" "$CRON_TMP" || echo "*/5 * * * * cd ${BACKEND_DIR} && /usr/bin/php artisan reminders:dispatch >> /var/log/crm-reminders.log 2>&1" >> "$CRON_TMP"

crontab "$CRON_TMP"
rm "$CRON_TMP"

touch /var/log/crm-scheduler.log /var/log/crm-reminders.log
chown "$DEPLOY_USER:$DEPLOY_USER" /var/log/crm-scheduler.log /var/log/crm-reminders.log

echo ""
echo "==============================================================="
echo "  Supervisor queue worker running. Cron scheduler installed."
echo ""
echo "  Verify:"
echo "    sudo supervisorctl status"
echo "    sudo crontab -l"
echo "    tail -f /var/log/crm-scheduler.log"
echo ""
echo "  Deployment complete. Hit https://${DOMAIN_APP:-app.yourdomain.com}"
echo "==============================================================="
