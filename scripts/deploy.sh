#!/usr/bin/env bash
# =============================================================================
# deploy.sh  —  runs on the server, called by GitHub Actions on every push
#               to main, and also by the in-app Deploy button.
#
# Place at: /var/www/crm-erp/scripts/deploy.sh
# Make executable: chmod +x /var/www/crm-erp/scripts/deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/crm-erp"
PHP="${PHP_BIN:-php}"
NPM="${NPM_BIN:-npm}"

echo "======================================================"
echo " CRM+ERP Deploy  —  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

cd "$APP_DIR"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
echo ""
echo "→ Pulling latest code from main..."
git pull origin main

# ── 2. Backend dependencies ───────────────────────────────────────────────────
echo ""
echo "→ Installing PHP dependencies..."
cd "$APP_DIR/backend"
$PHP /usr/local/bin/composer install \
    --no-dev --no-interaction --prefer-dist --optimize-autoloader

# ── 3. Run migrations ─────────────────────────────────────────────────────────
echo ""
echo "→ Running database migrations..."
$PHP artisan migrate --force

# ── 4. Cache config / routes / views ─────────────────────────────────────────
echo ""
echo "→ Caching Laravel config, routes, views..."
$PHP artisan config:cache
$PHP artisan route:cache
$PHP artisan view:cache

# ── 5. Build frontend ─────────────────────────────────────────────────────────
echo ""
echo "→ Building frontend..."
cd "$APP_DIR/frontend"
$NPM ci --no-audit --no-fund
$NPM run build

# ── 6. Restart queue workers + reload PHP-FPM ────────────────────────────────
echo ""
echo "→ Restarting services..."
cd "$APP_DIR/backend"
$PHP artisan queue:restart

# Reload PHP-FPM if running under systemd (graceful, zero-downtime)
if systemctl is-active --quiet php8.1-fpm 2>/dev/null; then
    sudo systemctl reload php8.1-fpm
elif systemctl is-active --quiet php8.2-fpm 2>/dev/null; then
    sudo systemctl reload php8.2-fpm
fi

echo ""
echo "======================================================"
echo " Deploy complete!"
echo "======================================================"
