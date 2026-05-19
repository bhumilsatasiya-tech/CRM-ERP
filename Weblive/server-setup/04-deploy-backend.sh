#!/usr/bin/env bash
###############################################################################
# 04-deploy-backend.sh <REPO_URL>
#
# First-time backend deploy:
#   - clones repo to /var/www/crm-erp
#   - composer install --no-dev
#   - copies prepared .env from ~/backend.env.production
#   - generates APP_KEY
#   - runs migrations (NOT migrate:fresh — preserves any imported data)
#   - runs idempotent seeders only (Auth, Companies, Settings, Finance, etc.)
#   - caches config/routes/views
#   - installs the Nginx vhost from ~/api.conf
###############################################################################

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: run with sudo"
    exit 1
fi

REPO_URL="${1:-}"
if [[ -z "$REPO_URL" ]]; then
    echo "Usage: sudo $0 <git-repo-url>"
    echo "Example: sudo $0 git@github.com:youruser/crm-erp.git"
    exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR=/var/www/crm-erp
BACKEND_DIR=$APP_DIR/backend
DOMAIN_API="${DOMAIN_API:-api.yourdomain.com}"

echo "==> Cloning repo to ${APP_DIR}"
mkdir -p /var/www
if [[ -d "$APP_DIR/.git" ]]; then
    echo "    repo already exists — pulling"
    sudo -u "$DEPLOY_USER" git -C "$APP_DIR" pull
else
    sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$APP_DIR"
fi

chown -R "$DEPLOY_USER:www-data" "$APP_DIR"

echo "==> Composer install"
sudo -u "$DEPLOY_USER" composer install --no-dev --optimize-autoloader --no-interaction \
    --working-dir="$BACKEND_DIR"

echo "==> .env"
if [[ ! -f /home/$DEPLOY_USER/backend.env.production ]]; then
    echo "ERROR: ~/backend.env.production not found. SCP it first."
    exit 1
fi
cp "/home/$DEPLOY_USER/backend.env.production" "$BACKEND_DIR/.env"
chown "$DEPLOY_USER:www-data" "$BACKEND_DIR/.env"
chmod 640 "$BACKEND_DIR/.env"

echo "==> APP_KEY"
if grep -q "^APP_KEY=$" "$BACKEND_DIR/.env" || grep -q "^APP_KEY=base64:$" "$BACKEND_DIR/.env"; then
    sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" key:generate --force
fi

echo "==> Storage permissions"
mkdir -p "$BACKEND_DIR/storage/logs"
mkdir -p "$BACKEND_DIR/storage/app/public"
mkdir -p "$BACKEND_DIR/storage/framework/cache"
mkdir -p "$BACKEND_DIR/storage/framework/sessions"
mkdir -p "$BACKEND_DIR/storage/framework/views"
mkdir -p "$BACKEND_DIR/bootstrap/cache"
chown -R "$DEPLOY_USER:www-data" "$BACKEND_DIR/storage" "$BACKEND_DIR/bootstrap/cache"
chmod -R 775 "$BACKEND_DIR/storage" "$BACKEND_DIR/bootstrap/cache"

echo "==> Storage symlink (public/storage)"
sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" storage:link

echo "==> Migrations"
read -rp "Run migrations? (y/n) " yn
if [[ "$yn" == "y" ]]; then
    sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" migrate --force
fi

echo "==> Seeders (idempotent — safe to re-run)"
read -rp "Run seeders? (only if this is a fresh DB) (y/n) " yn
if [[ "$yn" == "y" ]]; then
    for seeder in \
        'Modules\Auth\Database\Seeders\AuthDatabaseSeeder' \
        'Modules\Companies\Database\Seeders\CompaniesDatabaseSeeder' \
        'Modules\Settings\Database\Seeders\SettingsDatabaseSeeder' \
        'Modules\Crm\Database\Seeders\CrmDatabaseSeeder' \
        'Modules\Products\Database\Seeders\ProductsDatabaseSeeder' \
        'Modules\Inventory\Database\Seeders\InventoryDatabaseSeeder' \
        'Modules\Finance\Database\Seeders\FinanceDatabaseSeeder' \
        'Modules\Hr\Database\Seeders\HrDatabaseSeeder' \
        'Modules\Loans\Database\Seeders\LoansDatabaseSeeder' \
        'Modules\Templates\Database\Seeders\TemplatesDatabaseSeeder'
    do
        echo "    seeder: $seeder"
        sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" db:seed --class="$seeder" --force || \
            echo "    (seeder failed or already applied — continuing)"
    done
fi

echo "==> Cache config/routes/views/events"
sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" config:cache
sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" route:cache
sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" view:cache
sudo -u "$DEPLOY_USER" php "$BACKEND_DIR/artisan" event:cache

echo "==> Nginx vhost for ${DOMAIN_API}"
if [[ ! -f /home/$DEPLOY_USER/api.conf ]]; then
    echo "ERROR: ~/api.conf not found. SCP it first."
    exit 1
fi
sed "s/api\.yourdomain\.com/${DOMAIN_API}/g" "/home/$DEPLOY_USER/api.conf" \
    > "/etc/nginx/sites-available/${DOMAIN_API}.conf"
ln -sf "/etc/nginx/sites-available/${DOMAIN_API}.conf" \
    "/etc/nginx/sites-enabled/${DOMAIN_API}.conf"
nginx -t
systemctl reload nginx

echo ""
echo "==============================================================="
echo "  Backend deployed at ${BACKEND_DIR}"
echo "  Nginx vhost: ${DOMAIN_API}"
echo ""
echo "  Smoke test (replace IP with your server):"
echo "    curl -H 'Host: ${DOMAIN_API}' http://127.0.0.1/api/v1/health || echo 'no /health route yet'"
echo ""
echo "  Next: 05-deploy-frontend.sh"
echo "==============================================================="
