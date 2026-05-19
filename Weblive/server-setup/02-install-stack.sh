#!/usr/bin/env bash
###############################################################################
# 02-install-stack.sh
#
# Installs Nginx + PHP 8.1 + MySQL 8.0 + Redis 7 + Node 20 + Composer +
# Supervisor + Certbot on Ubuntu 22.04. Run with sudo as the deploy user.
###############################################################################

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: run with sudo"
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

echo "==> Nginx"
apt-get -y -qq install nginx
systemctl enable --now nginx

echo "==> PHP 8.1 + extensions"
apt-get -y -qq install software-properties-common
add-apt-repository -y ppa:ondrej/php
apt-get update -qq
apt-get -y -qq install \
    php8.1 php8.1-fpm php8.1-cli \
    php8.1-mysql php8.1-redis \
    php8.1-mbstring php8.1-xml php8.1-curl php8.1-zip \
    php8.1-gd php8.1-bcmath php8.1-intl php8.1-opcache \
    php8.1-soap php8.1-imagick

# Tune PHP for production
PHP_INI=/etc/php/8.1/fpm/php.ini
sed -i 's/^memory_limit = .*/memory_limit = 512M/'              $PHP_INI
sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 32M/' $PHP_INI
sed -i 's/^post_max_size = .*/post_max_size = 32M/'             $PHP_INI
sed -i 's/^max_execution_time = .*/max_execution_time = 120/'   $PHP_INI
sed -i 's/^;date.timezone =.*/date.timezone = Asia\/Kolkata/'   $PHP_INI

# OPcache for production — shared memory works fine on Linux (the Windows
# VirtualProtect bug noted in CLAUDE.md does NOT apply here)
cat > /etc/php/8.1/fpm/conf.d/10-opcache-prod.ini <<'EOF'
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.revalidate_freq=2
opcache.fast_shutdown=1
opcache.validate_timestamps=1
EOF

# PHP-FPM pool tuning for 4 GB RAM box
POOL=/etc/php/8.1/fpm/pool.d/www.conf
sed -i 's/^pm = .*/pm = dynamic/'                  $POOL
sed -i 's/^pm.max_children = .*/pm.max_children = 25/' $POOL
sed -i 's/^pm.start_servers = .*/pm.start_servers = 5/' $POOL
sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 5/' $POOL
sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 10/' $POOL
sed -i 's/^;pm.max_requests = .*/pm.max_requests = 500/' $POOL

systemctl enable --now php8.1-fpm
systemctl restart php8.1-fpm

echo "==> MySQL 8.0"
apt-get -y -qq install mysql-server
systemctl enable --now mysql

# Allow connections from PHP only on localhost (default, just being explicit)
sed -i 's/^bind-address.*/bind-address = 127.0.0.1/' /etc/mysql/mysql.conf.d/mysqld.cnf

# Buffer pool for 4 GB RAM box: 1 GB. Bump to 4 GB on an 8 GB box.
cat > /etc/mysql/mysql.conf.d/crm-tuning.cnf <<'EOF'
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size    = 256M
innodb_flush_log_at_trx_commit = 2
max_connections = 200
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+05:30'
EOF
systemctl restart mysql

echo "==> Redis 7"
apt-get -y -qq install redis-server
sed -i 's/^supervised .*/supervised systemd/'    /etc/redis/redis.conf
sed -i 's/^# maxmemory .*/maxmemory 512mb/'      /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl enable --now redis-server
systemctl restart redis-server

echo "==> Node.js 20"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get -y -qq install nodejs
node -v
npm -v

echo "==> Composer"
EXPECTED_CHECKSUM="$(php -r 'copy("https://composer.github.io/installer.sig", "php://stdout");')"
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
ACTUAL_CHECKSUM="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"
if [[ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]]; then
    echo "ERROR: composer installer checksum mismatch — aborting"
    rm composer-setup.php
    exit 1
fi
php composer-setup.php --quiet --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php
composer --version

echo "==> Supervisor"
apt-get -y -qq install supervisor
systemctl enable --now supervisor

echo "==> Certbot (nginx plugin)"
apt-get -y -qq install certbot python3-certbot-nginx

echo "==> Extras: git, rclone, htop, unzip"
apt-get -y -qq install git unzip jq rclone htop iotop

echo "==> Remove default Nginx site"
rm -f /etc/nginx/sites-enabled/default

echo ""
echo "==============================================================="
echo "  Stack install complete."
echo ""
echo "  Versions:"
nginx -v
php -v | head -1
mysql --version
redis-server --version | head -1
echo "  Node: $(node -v),  npm: $(npm -v),  Composer: $(composer --version | head -1)"
echo "==============================================================="
echo ""
echo "Next: 03-create-db.sh"
