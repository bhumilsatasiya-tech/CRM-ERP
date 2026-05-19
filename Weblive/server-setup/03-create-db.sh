#!/usr/bin/env bash
###############################################################################
# 03-create-db.sh
#
# Creates the production database + app user + locks down root.
# Prompts for the app user's password.
###############################################################################

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: run with sudo"
    exit 1
fi

DB_NAME="${DB_NAME:-crm_erp_prod}"
DB_USER="${DB_USER:-crm_erp_app}"

read -rsp "Enter STRONG password for MySQL user '${DB_USER}': " DB_PASS
echo
read -rsp "Confirm password: " DB_PASS_2
echo

if [[ "$DB_PASS" != "$DB_PASS_2" ]]; then
    echo "ERROR: passwords don't match"
    exit 1
fi

if [[ ${#DB_PASS} -lt 16 ]]; then
    echo "ERROR: password must be at least 16 characters"
    exit 1
fi

echo "==> Securing root + creating DB/user"

# Default MySQL 8 root uses auth_socket — works without password from root shell.
mysql <<EOF
-- Drop anonymous users
DELETE FROM mysql.user WHERE User='';
-- Drop test DB
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
-- Disable remote root
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Create app DB + user
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost'  IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';

GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';

FLUSH PRIVILEGES;
EOF

echo ""
echo "==============================================================="
echo "  Database ready."
echo "  DB:   ${DB_NAME}"
echo "  User: ${DB_USER}@localhost"
echo ""
echo "  Put the password into env/backend.env.production at DB_PASSWORD."
echo "  Don't lose it — there's no automated recovery path."
echo "==============================================================="
