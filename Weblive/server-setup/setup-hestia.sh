#!/usr/bin/env bash
# =============================================================================
# setup-hestia.sh  —  One-shot setup for CRM+ERP on a HestiaCP VPS
#
# Run as root:
#   bash setup-hestia.sh diamond.harjinatural.com admin
#                        ^^ your domain            ^^ your HestiaCP username
# =============================================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

DOMAIN="${1:-diamond.harjinatural.com}"
HESTIA_USER="${2:-admin}"
REPO="https://github.com/bhumilsatasiya-tech/CRM-ERP.git"
APP_DIR="/home/${HESTIA_USER}/crm-erp"
WEB_ROOT="/home/${HESTIA_USER}/web/${DOMAIN}/public_html"
DB_NAME="crm_erp"
DB_USER="crm_erp_user"
DB_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 20)

echo ""
echo "=================================================="
echo "  CRM+ERP Setup on HestiaCP"
echo "  Domain  : $DOMAIN"
echo "  App dir : $APP_DIR"
echo "  Web root: $WEB_ROOT"
echo "=================================================="
echo ""

# ── 1. System packages ────────────────────────────────────────────────────────
echo "→ Installing system packages..."
apt-get update -qq
apt-get install -y -qq git curl unzip

# ── 2. PHP extensions (HestiaCP usually has PHP 8.x already) ─────────────────
echo "→ Checking PHP..."
PHP_BIN=""
for v in 8.2 8.1 8.0; do
  if command -v "php${v}" &>/dev/null; then
    PHP_BIN="php${v}"
    break
  elif command -v php &>/dev/null; then
    PHP_BIN="php"
    break
  fi
done

if [ -z "$PHP_BIN" ]; then
  echo "  PHP not found — installing PHP 8.2..."
  apt-get install -y -qq php8.2-fpm php8.2-cli php8.2-mysql php8.2-mbstring \
    php8.2-xml php8.2-zip php8.2-bcmath php8.2-intl php8.2-curl php8.2-gd
  PHP_BIN="php8.2"
else
  echo "  Found: $PHP_BIN ($(${PHP_BIN} -r 'echo PHP_VERSION;'))"
  # Install any missing extensions
  PHP_VER=$(${PHP_BIN} -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
  apt-get install -y -qq \
    "php${PHP_VER}-mysql" "php${PHP_VER}-mbstring" "php${PHP_VER}-xml" \
    "php${PHP_VER}-zip" "php${PHP_VER}-bcmath" "php${PHP_VER}-intl" \
    "php${PHP_VER}-curl" "php${PHP_VER}-gd" 2>/dev/null || true
fi

# ── 3. Composer ───────────────────────────────────────────────────────────────
echo "→ Installing Composer..."
if ! command -v composer &>/dev/null; then
  curl -sS https://getcomposer.org/installer | $PHP_BIN -- --install-dir=/usr/local/bin --filename=composer
fi
echo "  Composer: $(composer --version 2>/dev/null | head -1)"

# ── 4. Node.js 20 ─────────────────────────────────────────────────────────────
echo "→ Checking Node.js..."
if ! command -v node &>/dev/null || [ "$(node -e 'process.stdout.write(process.version.slice(1).split(".")[0])')" -lt 18 ]; then
  echo "  Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
echo "  Node: $(node -v), npm: $(npm -v)"

# ── 5. Create MySQL database ───────────────────────────────────────────────────
echo "→ Creating database..."
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
echo "  DB: ${DB_NAME}  User: ${DB_USER}  Pass: ${DB_PASS}"

# ── 6. Clone repo ─────────────────────────────────────────────────────────────
echo "→ Cloning repo..."
if [ -d "$APP_DIR/.git" ]; then
  echo "  Repo exists — pulling latest..."
  git -C "$APP_DIR" pull origin main
else
  git clone "$REPO" "$APP_DIR"
fi

# ── 7. Backend .env ───────────────────────────────────────────────────────────
echo "→ Writing backend .env..."
APP_KEY=$(${PHP_BIN} -r "echo 'base64:'.base64_encode(random_bytes(32));")

cat > "${APP_DIR}/backend/.env" <<ENV
APP_NAME="CRM+ERP"
APP_ENV=production
APP_KEY=${APP_KEY}
APP_DEBUG=false
APP_URL=https://${DOMAIN}
APP_TIMEZONE=Asia/Kolkata

LOG_CHANNEL=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_PERSISTENT=true

CACHE_DRIVER=file
SESSION_DRIVER=file
SESSION_LIFETIME=120
QUEUE_CONNECTION=sync

FILESYSTEM_DISK=local
SHARED_STORAGE_DRIVER=local
SHARED_STORAGE_PATH=${APP_DIR}/storage

SANCTUM_STATEFUL_DOMAINS=${DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN}
CORS_SUPPORTS_CREDENTIALS=false

AUTH_ACCESS_TTL=1440
AUTH_REFRESH_TTL=43200
ADMIN_SEED_EMAIL=admin@crm-erp.local
ADMIN_SEED_PASSWORD=Demo@12345

MAIL_MAILER=log
MAIL_FROM_ADDRESS=no-reply@${DOMAIN}
MAIL_FROM_NAME="CRM+ERP"

WHATSAPP_PROVIDER=placeholder
OCR_PROVIDER_CLASS=
ENV

# ── 8. Composer install ───────────────────────────────────────────────────────
echo "→ Installing PHP dependencies..."
cd "${APP_DIR}/backend"
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# ── 9. Storage permissions ────────────────────────────────────────────────────
echo "→ Setting permissions..."
mkdir -p "${APP_DIR}/storage/logs" "${APP_DIR}/storage/framework/cache" \
         "${APP_DIR}/storage/framework/sessions" "${APP_DIR}/storage/framework/views"

PHP_FPM_USER="www-data"
chown -R "${PHP_FPM_USER}:${HESTIA_USER}" "${APP_DIR}/backend/storage" \
         "${APP_DIR}/backend/bootstrap/cache" "${APP_DIR}/storage"
chmod -R 775 "${APP_DIR}/backend/storage" "${APP_DIR}/backend/bootstrap/cache" \
             "${APP_DIR}/storage"

# ── 10. Migrate + seed ────────────────────────────────────────────────────────
echo "→ Running migrations..."
cd "${APP_DIR}/backend"
$PHP_BIN artisan migrate:fresh --force

echo "→ Seeding database..."
for SEEDER in \
  "Modules\\Auth\\Database\\Seeders\\AuthDatabaseSeeder" \
  "Modules\\Companies\\Database\\Seeders\\CompaniesDatabaseSeeder" \
  "Modules\\Settings\\Database\\Seeders\\SettingsDatabaseSeeder" \
  "Modules\\Crm\\Database\\Seeders\\CrmDatabaseSeeder" \
  "Modules\\Products\\Database\\Seeders\\ProductsDatabaseSeeder" \
  "Modules\\Inventory\\Database\\Seeders\\InventoryDatabaseSeeder" \
  "Modules\\Finance\\Database\\Seeders\\FinanceDatabaseSeeder" \
  "Modules\\Hr\\Database\\Seeders\\HrDatabaseSeeder" \
  "Modules\\Loans\\Database\\Seeders\\LoansDatabaseSeeder" \
  "Modules\\Templates\\Database\\Seeders\\TemplatesDatabaseSeeder"
do
  $PHP_BIN artisan db:seed --class="$SEEDER" --force
done

# Cache for production
$PHP_BIN artisan config:cache
$PHP_BIN artisan route:cache
$PHP_BIN artisan view:cache

# ── 11. Build frontend ────────────────────────────────────────────────────────
echo "→ Building frontend..."
cd "${APP_DIR}/frontend"

cat > .env <<FENV
VITE_API_BASE_URL=https://${DOMAIN}/api/v1
VITE_APP_NAME=CRM-ERP
FENV

npm ci --no-audit --no-fund
npm run build

# Copy built files to HestiaCP web root
echo "→ Copying frontend build to web root..."
rm -rf "${WEB_ROOT:?}"/*
cp -r "${APP_DIR}/frontend/dist/"* "${WEB_ROOT}/"

# ── 12. Nginx config (HestiaCP custom locations) ──────────────────────────────
echo "→ Configuring nginx..."
CONF_DIR="/home/${HESTIA_USER}/conf/web/${DOMAIN}"
mkdir -p "$CONF_DIR"

# Detect PHP-FPM socket
FPM_SOCK=""
for sock in /var/run/php/php8.2-fpm.sock /var/run/php/php8.1-fpm.sock /var/run/php/php8.0-fpm.sock; do
  [ -S "$sock" ] && FPM_SOCK="$sock" && break
done
[ -z "$FPM_SOCK" ] && FPM_SOCK="127.0.0.1:9000"

cat > "${CONF_DIR}/nginx.conf_locations" <<NGINX
# Laravel API — proxy all /api/ requests to PHP-FPM
location /api/ {
    root ${APP_DIR}/backend/public;
    try_files \$uri \$uri/ @laravel;
    location ~ \.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${FPM_SOCK};
        fastcgi_param SCRIPT_FILENAME ${APP_DIR}/backend/public/index.php;
        fastcgi_param DOCUMENT_ROOT ${APP_DIR}/backend/public;
        include fastcgi_params;
    }
}
location @laravel {
    fastcgi_pass unix:${FPM_SOCK};
    fastcgi_param SCRIPT_FILENAME ${APP_DIR}/backend/public/index.php;
    fastcgi_param DOCUMENT_ROOT ${APP_DIR}/backend/public;
    include fastcgi_params;
}
# React SPA — serve index.html for all non-file routes
location / {
    try_files \$uri \$uri/ /index.html;
}
NGINX

# Reload nginx via HestiaCP
if command -v v-restart-web &>/dev/null; then
  v-restart-web
else
  nginx -t && systemctl reload nginx
fi

# ── 13. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "=================================================="
echo "  SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "  URL    : https://${DOMAIN}"
echo "  Login  : admin@crm-erp.local"
echo "  Password: Demo@12345"
echo ""
echo "  DB Name : ${DB_NAME}"
echo "  DB User : ${DB_USER}"
echo "  DB Pass : ${DB_PASS}  ← save this!"
echo ""
echo "  App dir : ${APP_DIR}"
echo "=================================================="
