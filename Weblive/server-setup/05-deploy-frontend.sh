#!/usr/bin/env bash
###############################################################################
# 05-deploy-frontend.sh
#
# First-time frontend build + publish.
# Expects ~/frontend.env.production and ~/app.conf to be SCP'd over.
###############################################################################

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: run with sudo"
    exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR=/var/www/crm-erp
FRONTEND_DIR=$APP_DIR/frontend
DOMAIN_APP="${DOMAIN_APP:-app.yourdomain.com}"

if [[ ! -d "$FRONTEND_DIR" ]]; then
    echo "ERROR: $FRONTEND_DIR not found. Run 04-deploy-backend.sh first."
    exit 1
fi

echo "==> Copy .env"
if [[ ! -f /home/$DEPLOY_USER/frontend.env.production ]]; then
    echo "ERROR: ~/frontend.env.production not found. SCP it first."
    exit 1
fi
cp "/home/$DEPLOY_USER/frontend.env.production" "$FRONTEND_DIR/.env"
chown "$DEPLOY_USER:$DEPLOY_USER" "$FRONTEND_DIR/.env"

echo "==> npm ci (clean install from lock)"
cd "$FRONTEND_DIR"
sudo -u "$DEPLOY_USER" npm ci --no-audit --no-fund

echo "==> npm run build"
sudo -u "$DEPLOY_USER" NODE_OPTIONS=--max_old_space_size=2048 npm run build

if [[ ! -d "$FRONTEND_DIR/dist" ]]; then
    echo "ERROR: build did not produce dist/. Check Vite logs."
    exit 1
fi

echo "==> Build OK ($(du -sh "$FRONTEND_DIR/dist" | cut -f1))"

echo "==> Nginx vhost for ${DOMAIN_APP}"
if [[ ! -f /home/$DEPLOY_USER/app.conf ]]; then
    echo "ERROR: ~/app.conf not found. SCP it first."
    exit 1
fi
sed -e "s/app\.yourdomain\.com/${DOMAIN_APP}/g" \
    -e "s/api\.yourdomain\.com/${DOMAIN_API:-api.yourdomain.com}/g" \
    "/home/$DEPLOY_USER/app.conf" \
    > "/etc/nginx/sites-available/${DOMAIN_APP}.conf"
ln -sf "/etc/nginx/sites-available/${DOMAIN_APP}.conf" \
    "/etc/nginx/sites-enabled/${DOMAIN_APP}.conf"

# Frontend dir needs to be readable by www-data (Nginx worker)
chown -R "$DEPLOY_USER:www-data" "$FRONTEND_DIR/dist"
chmod -R 755 "$FRONTEND_DIR/dist"

nginx -t
systemctl reload nginx

echo ""
echo "==============================================================="
echo "  Frontend deployed."
echo "  Bundle: ${FRONTEND_DIR}/dist"
echo "  Nginx vhost: ${DOMAIN_APP}"
echo ""
echo "  Smoke test:"
echo "    curl -I -H 'Host: ${DOMAIN_APP}' http://127.0.0.1/"
echo ""
echo "  Next: 06-ssl-certbot.sh"
echo "==============================================================="
