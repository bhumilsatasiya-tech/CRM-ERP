# Launch Checklist

Tick every box before announcing the URL to users. After launch, run through
the post-launch list within 24 h.

## Pre-launch (run on the live server)

### Infrastructure

- [ ] UFW firewall: `sudo ufw status` shows only 22, 80, 443 allowed.
- [ ] SSH key-only: `grep PasswordAuthentication /etc/ssh/sshd_config` = `no`.
- [ ] Root SSH disabled: `grep PermitRootLogin /etc/ssh/sshd_config` = `prohibit-password`.
- [ ] fail2ban active: `sudo fail2ban-client status`.
- [ ] Swap mounted: `swapon --show` shows /swapfile.
- [ ] 2FA on hosting provider account.
- [ ] 2FA on domain registrar account.
- [ ] DNS records: `dig +short app.yourdomain.com` and `dig +short api.yourdomain.com` both = server IP.

### Services

- [ ] Nginx: `sudo systemctl status nginx` active.
- [ ] PHP-FPM: `sudo systemctl status php8.1-fpm` active.
- [ ] MySQL: `sudo systemctl status mysql` active, `mysql --version` ≥ 8.0.
- [ ] Redis: `redis-cli ping` returns `PONG`.
- [ ] Supervisor: `sudo supervisorctl status` shows `crm-queue:*` RUNNING.
- [ ] Cron: `sudo crontab -l` has `schedule:run` and `reminders:dispatch` lines.
- [ ] SSL: `curl -sI https://app.yourdomain.com | grep HTTP` = 200; cert valid.
- [ ] SSL renewal works: `sudo certbot renew --dry-run` succeeds.

### App config

- [ ] `APP_ENV=production` in backend `.env`.
- [ ] `APP_DEBUG=false` in backend `.env`.
- [ ] `APP_KEY` set (long base64 string).
- [ ] `LOG_LEVEL=warning` or higher.
- [ ] `SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com`.
- [ ] `CORS_ALLOWED_ORIGINS=https://app.yourdomain.com`.
- [ ] `MAIL_*` filled and tested.
- [ ] `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` set to NON-default values.
- [ ] `DB_PASSWORD` is a 16+ char random string.
- [ ] `TRUSTED_PROXIES=*` if behind Cloudflare.
- [ ] Caches warmed: `php artisan config:cache && route:cache && view:cache && event:cache`.

### Smoke tests

- [ ] `https://app.yourdomain.com` returns the login screen.
- [ ] `https://api.yourdomain.com/api/v1/auth/login` accepts POST and returns a token.
- [ ] Logged-in admin can switch companies.
- [ ] Create a Quotation → approve → convert to SO → create Invoice → post → verify stock_ledger row appears.
- [ ] Create a Purchase Order → GRN → verify stock_ledger row.
- [ ] Create a Production Batch → complete → verify FG IN + Raw OUT in ledger.
- [ ] Create an Export Invoice → verify auto-spawned PL + TI both appear.
- [ ] Create an IRM (advance) → open Lodgement → allocate → accept → verify EI paid_amount.
- [ ] Trigger a Save & Email on an Invoice — verify the test recipient receives it.
- [ ] Upload a Document attachment — verify the file lands in storage.
- [ ] Generate a PDF (Invoice "Download PDF") — verify it opens.
- [ ] Browser DevTools console: no CORS errors, no 401 loops.
- [ ] Browser DevTools network: no 500s, no failed asset loads.

### Performance

- [ ] First-load (cold cache) of `app.yourdomain.com` < 2 s.
- [ ] Dashboard cold-cache API response < 1 s.
- [ ] Lighthouse score ≥ 80 (Performance, Best Practices).
- [ ] `curl -w '%{time_total}\n' -o /dev/null -s https://api.yourdomain.com/api/v1/health` < 200 ms.

### Backups

- [ ] `/usr/local/bin/crm-backup-db.sh` runs cleanly when invoked manually.
- [ ] `/var/backups/crm-erp/` has at least one `.sql.gz` file.
- [ ] `restore-db.sh` tested in a sandbox (NOT prod) — confirmed restorable.
- [ ] Off-server copy (rclone or similar) verified.

### Monitoring

- [ ] UptimeRobot ping on `https://app.yourdomain.com` every 5 min.
- [ ] UptimeRobot ping on `https://api.yourdomain.com/api/v1/health` every 5 min.
- [ ] Alert email/SMS goes to a human who watches it.

---

## Post-launch (within 24 h)

- [ ] First user logs in and changes the seeded admin password.
- [ ] Check `/var/log/nginx/api.yourdomain.com.error.log` — no recurring 500s.
- [ ] Check `storage/logs/laravel.log` — no UNHANDLED exceptions.
- [ ] Check `/var/log/supervisor/crm-queue.log` — jobs running, none failed.
- [ ] `redis-cli info memory` — `used_memory_human` reasonable (< 100 MB at this stage).
- [ ] `df -h` — disk well under 70 %.
- [ ] `free -h` — swap not heavily used.
- [ ] `mysql -e "SHOW PROCESSLIST"` — no stuck queries.

## Post-launch (within 1 week)

- [ ] Cloudflare WAF "Bot Fight Mode" enabled.
- [ ] Cloudflare cache rules configured (cache `/assets/*` for 1y).
- [ ] First weekly backup verified.
- [ ] Sentry / Bugsnag wired up if you decided to use one.
- [ ] User onboarding doc shared with the first batch of users.
- [ ] Off-hours auto-renew test for SSL passed silently (check certbot.timer logs).

## Post-launch (within 1 month)

- [ ] Quarterly `apt upgrade` performed on a maintenance window.
- [ ] DB size + growth rate measured: `SELECT table_schema, ROUND(SUM(data_length+index_length)/1024/1024) AS mb FROM information_schema.tables GROUP BY table_schema;`.
- [ ] If DB > 5 GB, plan move to managed DB tier.
- [ ] If storage/app/public > 20 GB, plan move to S3/R2/B2.
- [ ] Review fail2ban logs: `sudo fail2ban-client status sshd`.
