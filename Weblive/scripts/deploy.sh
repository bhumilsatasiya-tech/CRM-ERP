#!/usr/bin/env bash
###############################################################################
# deploy.sh — repeat-deploy after the first launch
#
# Run on the server as the `deploy` user. Pulls latest main, rebuilds, runs
# migrations, refreshes caches, restarts queue. ~30–60 s downtime per deploy.
#
# Place at /var/www/crm-erp/Weblive/scripts/deploy.sh on the server.
###############################################################################

set -euo pipefail

APP_DIR=/var/www/crm-erp
BACKEND_DIR=$APP_DIR/backend
FRONTEND_DIR=$APP_DIR/frontend
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

CURRENT_SHA=$(git rev-parse --short HEAD)
echo "==> Current commit: $CURRENT_SHA"
echo "==> Pulling $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
NEW_SHA=$(git rev-parse --short HEAD)
echo "==> New commit: $NEW_SHA"
if [[ "$CURRENT_SHA" == "$NEW_SHA" ]]; then
    echo "==> No new commits. Nothing to deploy."
    read -rp "Force re-deploy anyway? [y/N] " yn
    [[ "$yn" == "y" ]] || exit 0
fi

echo "==> Maintenance mode ON"
php "$BACKEND_DIR/artisan" down --retry=60 --refresh=15 \
    --secret="$(openssl rand -hex 16)" || true

# ----- Backend ---------------------------------------------------------------
cd "$BACKEND_DIR"

echo "==> Composer install"
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Migrations"
php artisan migrate --force

echo "==> Cache refresh"
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan event:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# ----- Frontend --------------------------------------------------------------
cd "$FRONTEND_DIR"

echo "==> npm ci"
npm ci --no-audit --no-fund

echo "==> npm run build"
NODE_OPTIONS=--max_old_space_size=2048 npm run build

# ----- Restart workers -------------------------------------------------------
echo "==> Restart queue workers"
sudo /usr/bin/supervisorctl restart crm-queue:*

echo "==> Reload PHP-FPM (drops OPcache, picks up new code)"
sudo /bin/systemctl restart php8.1-fpm

echo "==> Reload Nginx"
sudo /bin/systemctl reload nginx

echo "==> Maintenance mode OFF"
php "$BACKEND_DIR/artisan" up

echo ""
echo "==============================================================="
echo "  Deployed $NEW_SHA (was $CURRENT_SHA)"
echo "  Window: ~$(($(date +%s) - $(stat -c %Y "$BACKEND_DIR/storage/framework/down" 2>/dev/null || date +%s)))s"
echo "==============================================================="
