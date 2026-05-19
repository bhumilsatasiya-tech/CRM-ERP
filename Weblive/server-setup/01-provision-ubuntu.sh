#!/usr/bin/env bash
###############################################################################
# 01-provision-ubuntu.sh
#
# Run as ROOT on a fresh Ubuntu 22.04 server. One-time bootstrap:
#   - patches & upgrades the system
#   - creates an unprivileged `deploy` user (with sudo)
#   - locks down SSH (key-only, no root password)
#   - enables UFW firewall + fail2ban
#   - creates a swap file (helps on tiny VPS during npm build)
#   - generates SSH key for `deploy` user to use against your Git host
#
# Usage:   chmod +x 01-provision-ubuntu.sh && ./01-provision-ubuntu.sh
###############################################################################

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SWAP_SIZE_GB="${SWAP_SIZE_GB:-4}"

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: run this script as root."
    exit 1
fi

if ! grep -q "Ubuntu 22.04" /etc/os-release; then
    echo "WARN: this script is tuned for Ubuntu 22.04. Detected:"
    grep PRETTY_NAME /etc/os-release
    read -rp "Continue anyway? [y/N] " yn
    [[ "$yn" == "y" || "$yn" == "Y" ]] || exit 1
fi

echo "==> [1/8] System patches"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get -y -qq upgrade
apt-get -y -qq install curl wget ufw fail2ban htop unattended-upgrades

echo "==> [2/8] Unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "==> [3/8] Create deploy user: ${DEPLOY_USER}"
if id "${DEPLOY_USER}" >/dev/null 2>&1; then
    echo "    user already exists, skipping creation"
else
    adduser --disabled-password --gecos "" "${DEPLOY_USER}"
    usermod -aG sudo "${DEPLOY_USER}"
fi
# Passwordless sudo only for the narrow commands the deploy scripts run.
# Adjust if you prefer requiring sudo password every time.
cat > /etc/sudoers.d/deploy <<EOF
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart php8.1-fpm, /bin/systemctl reload nginx, /usr/bin/supervisorctl restart crm-queue:*, /usr/bin/supervisorctl status, /usr/bin/certbot
EOF
chmod 440 /etc/sudoers.d/deploy

echo "==> [4/8] Copy root's authorized_keys to ${DEPLOY_USER}"
mkdir -p /home/${DEPLOY_USER}/.ssh
if [[ -f /root/.ssh/authorized_keys ]]; then
    cp /root/.ssh/authorized_keys /home/${DEPLOY_USER}/.ssh/authorized_keys
fi
chown -R ${DEPLOY_USER}:${DEPLOY_USER} /home/${DEPLOY_USER}/.ssh
chmod 700 /home/${DEPLOY_USER}/.ssh
chmod 600 /home/${DEPLOY_USER}/.ssh/authorized_keys 2>/dev/null || true

echo "==> [5/8] Harden SSH"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
systemctl reload sshd

echo "==> [6/8] UFW firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     comment 'SSH'
ufw allow 80/tcp     comment 'HTTP'
ufw allow 443/tcp    comment 'HTTPS'
ufw --force enable
ufw status verbose

echo "==> [7/8] fail2ban"
systemctl enable --now fail2ban
cat > /etc/fail2ban/jail.d/crm.conf <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/*error.log
maxretry = 10
bantime = 600
EOF
systemctl restart fail2ban

echo "==> [8/8] Swap file (${SWAP_SIZE_GB} GB)"
if [[ -f /swapfile ]]; then
    echo "    /swapfile already exists, skipping"
else
    fallocate -l ${SWAP_SIZE_GB}G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl vm.swappiness=10
fi

echo "==> Generate SSH key for deploy user (for your Git remote)"
sudo -u "${DEPLOY_USER}" bash -c '
    if [[ ! -f ~/.ssh/id_ed25519 ]]; then
        ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C "deploy@$(hostname)"
    fi
'
echo ""
echo "==============================================================="
echo "  Deploy user '${DEPLOY_USER}' SSH PUBLIC KEY — add this as a"
echo "  read-only deploy key on your private Git repo:"
echo "==============================================================="
cat /home/${DEPLOY_USER}/.ssh/id_ed25519.pub
echo "==============================================================="
echo ""
echo "Provisioning complete. Next:"
echo "  1. Add the key above to GitHub/GitLab deploy keys."
echo "  2. Disconnect, reconnect as ${DEPLOY_USER}:"
echo "       ssh ${DEPLOY_USER}@<server-ip>"
echo "  3. Run 02-install-stack.sh"
