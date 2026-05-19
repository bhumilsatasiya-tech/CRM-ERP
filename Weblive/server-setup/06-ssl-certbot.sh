#!/usr/bin/env bash
###############################################################################
# 06-ssl-certbot.sh <app-domain> <api-domain> <email>
#
# Issues Let's Encrypt certs for both subdomains, rewires Nginx to listen on
# 443, adds HTTP→HTTPS redirect, installs auto-renewal timer.
#
# Prerequisites:
#   - DNS A records must point at this server (check with `dig <domain>`).
#   - If Cloudflare proxied: set proxy to DNS only (grey cloud) before running.
###############################################################################

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: run with sudo"
    exit 1
fi

DOMAIN_APP="${1:-}"
DOMAIN_API="${2:-}"
EMAIL="${3:-}"

if [[ -z "$DOMAIN_APP" || -z "$DOMAIN_API" || -z "$EMAIL" ]]; then
    echo "Usage: sudo $0 <app-domain> <api-domain> <email>"
    echo "Example: sudo $0 app.example.com api.example.com ops@example.com"
    exit 1
fi

echo "==> DNS sanity check"
APP_IP=$(dig +short "$DOMAIN_APP" | tail -n1)
API_IP=$(dig +short "$DOMAIN_API" | tail -n1)
THIS_IP=$(curl -s -4 https://api.ipify.org)
echo "    this server: $THIS_IP"
echo "    $DOMAIN_APP resolves to: $APP_IP"
echo "    $DOMAIN_API resolves to: $API_IP"
if [[ "$APP_IP" != "$THIS_IP" || "$API_IP" != "$THIS_IP" ]]; then
    echo "WARN: DNS does not point at this server. Cert issuance will fail."
    echo "      If using Cloudflare proxied, switch to DNS-only first."
    read -rp "Continue anyway? [y/N] " yn
    [[ "$yn" == "y" ]] || exit 1
fi

echo "==> Running certbot for both domains"
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect \
    --hsts \
    --staple-ocsp \
    -d "$DOMAIN_APP" \
    -d "$DOMAIN_API"

echo "==> Verifying auto-renew is enabled"
systemctl status certbot.timer --no-pager | head -5

echo ""
echo "==============================================================="
echo "  SSL issued for ${DOMAIN_APP} and ${DOMAIN_API}"
echo "  Auto-renew: certbot.timer (twice daily check)"
echo ""
echo "  Test renewal (dry run):"
echo "    sudo certbot renew --dry-run"
echo ""
echo "  Next: 07-supervisor-queue.sh"
echo "==============================================================="
