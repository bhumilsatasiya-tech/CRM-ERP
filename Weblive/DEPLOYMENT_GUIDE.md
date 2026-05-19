# Deployment Guide — CRM+ERP on a Linux VPS

Step-by-step playbook to take the local CRM+ERP live. Assumes you've already
filled in `PRE-LAUNCH-DECISIONS.md`. Total time: ~2–3 hours on launch day,
plus 24 h for DNS propagation if you're impatient.

> Convention used below:
> - `LOCAL$` means run on your Windows machine (PowerShell).
> - `ROOT@srv$` means SSH'd in to the VPS as `root`.
> - `deploy@srv$` means SSH'd in as the unprivileged `deploy` user.

---

## Phase 0 — Prerequisites (~30 min)

1. **Buy a domain** (Namecheap / Cloudflare). Cost ≈ ₹800/yr (.com).
2. **Sign up for a VPS** (Hetzner / DO / Vultr). 2 vCPU / 4 GB RAM is enough
   to start; cost ≈ ₹450/mo (Hetzner CX22). Pick **Ubuntu 22.04 LTS**.
3. **Add your SSH public key** in the VPS dashboard so you can SSH in
   without a password.
4. **Sign up for a mail provider** (Brevo / Resend free tier). Verify your
   domain and add the SPF/DKIM records the provider gives you.
5. **Push the repo to private Git** (GitHub recommended). From your Windows
   machine:

   ```powershell
   cd E:\CRM+ERP
   git init
   git add .
   git commit -m "Initial production-ready snapshot"
   git remote add origin git@github.com:<youruser>/crm-erp.git
   git push -u origin main
   ```

   Make sure `.env`, `node_modules`, `vendor`, `storage/app/public` are in
   `.gitignore` (they should already be).

6. **Point DNS** at the (about-to-be) server's IP. In your registrar /
   Cloudflare DNS panel:

   ```
   A   app   <SERVER_IP>   Auto
   A   api   <SERVER_IP>   Auto
   ```

   If you're using Cloudflare, set the proxy status to **DNS only (grey
   cloud)** for now. Flip to Proxied after SSL is issued.

7. **Wait for DNS** to propagate. `nslookup app.yourdomain.com` should
   resolve to your IP within ~5 min if the TTL is low, otherwise up to 24 h.

---

## Phase 1 — Provision the server (~20 min)

Get the server IP from your provider's dashboard. Open PowerShell on Windows:

```powershell
LOCAL$ ssh root@<SERVER_IP>
```

You're now `ROOT@srv$`. Upload and run the provisioning script:

```powershell
# On Windows, in another PowerShell window:
LOCAL$ scp E:\CRM+ERP\Weblive\server-setup\01-provision-ubuntu.sh root@<SERVER_IP>:/root/
```

Back in the SSH session:

```bash
ROOT@srv$ chmod +x /root/01-provision-ubuntu.sh
ROOT@srv$ /root/01-provision-ubuntu.sh
```

This script:
- Updates the system
- Creates a `deploy` user with sudo
- Configures UFW firewall (allow 22, 80, 443; deny everything else)
- Installs fail2ban
- Disables root SSH password login (key-only)
- Creates a swap file (helps on small VPS)
- Generates an SSH key for the deploy user (add this to your private Git repo
  as a deploy key when prompted)

**Reconnect as the deploy user** (passwordless if you uploaded the key right):

```powershell
LOCAL$ ssh deploy@<SERVER_IP>
```

---

## Phase 2 — Install the stack (~10 min)

```powershell
LOCAL$ scp E:\CRM+ERP\Weblive\server-setup\02-install-stack.sh deploy@<SERVER_IP>:~/
```

```bash
deploy@srv$ chmod +x ~/02-install-stack.sh
deploy@srv$ sudo ~/02-install-stack.sh
```

Installs:
- Nginx
- PHP 8.1 + extensions (cli, fpm, mbstring, xml, mysql, curl, zip, gd, bcmath, intl, redis, opcache)
- MySQL 8.0
- Redis 7
- Node.js 20 + npm
- Composer
- Certbot
- Supervisor
- unzip, git, htop, ufw, fail2ban

When MySQL prompts during install, leave it open (we'll lock it down in step 3).

---

## Phase 3 — Create the database (~5 min)

Generate a strong password:

```powershell
LOCAL$ # On Windows, PowerShell:
[Convert]::ToBase64String((1..18 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy that password. Then on the server:

```powershell
LOCAL$ scp E:\CRM+ERP\Weblive\server-setup\03-create-db.sh deploy@<SERVER_IP>:~/
```

```bash
deploy@srv$ chmod +x ~/03-create-db.sh
deploy@srv$ sudo ~/03-create-db.sh
```

The script will prompt for the password. It:
- Creates DB `crm_erp_prod`
- Creates user `crm_erp_app` with that password
- Grants it full access to `crm_erp_prod` only
- Runs `mysql_secure_installation` non-interactively (drops anonymous users,
  test DB, remote root login)

Save the password — it goes into `env/backend.env.production` in the next step.

---

## Phase 4 — Migrate the existing local data (optional, ~10 min)

If you have real data in your local XAMPP MySQL that you want to carry over:

**On Windows:**

```powershell
LOCAL$ cd E:\CRM+ERP\backend
LOCAL$ C:\xampp\mysql\bin\mysqldump.exe -u root crm_erp `
       --single-transaction --routines --triggers `
       --default-character-set=utf8mb4 `
       --result-file=E:\CRM+ERP\Weblive\initial-dump.sql
LOCAL$ scp E:\CRM+ERP\Weblive\initial-dump.sql deploy@<SERVER_IP>:~/
```

**On server:**

```bash
deploy@srv$ mysql -u crm_erp_app -p crm_erp_prod < ~/initial-dump.sql
deploy@srv$ rm ~/initial-dump.sql   # don't leave it lying around
```

If you DON'T have data to migrate, skip this — the deploy script will run
`migrate:fresh` and seed the default admin.

---

## Phase 5 — Deploy the backend (first time, ~15 min)

```powershell
LOCAL$ scp E:\CRM+ERP\Weblive\server-setup\04-deploy-backend.sh deploy@<SERVER_IP>:~/
LOCAL$ scp E:\CRM+ERP\Weblive\env\backend.env.production deploy@<SERVER_IP>:~/
LOCAL$ scp E:\CRM+ERP\Weblive\nginx\api.conf deploy@<SERVER_IP>:~/
```

**Before running**, open `~/backend.env.production` on the server with `nano`
and fill in:
- `APP_KEY=` (leave blank — script generates)
- `APP_URL=https://api.yourdomain.com`
- `DB_PASSWORD=` the one from step 3
- `MAIL_*` from your provider
- `SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com`
- `CORS_ALLOWED_ORIGINS=https://app.yourdomain.com`

Then:

```bash
deploy@srv$ chmod +x ~/04-deploy-backend.sh
deploy@srv$ sudo ~/04-deploy-backend.sh <REPO_URL>
```

The script:
- Clones the repo to `/var/www/crm-erp`
- Sets ownership to `deploy:www-data`
- Copies `~/backend.env.production` → `/var/www/crm-erp/backend/.env`
- Runs `composer install --no-dev --optimize-autoloader`
- Generates `APP_KEY`
- Runs `php artisan migrate --force` (NOT `migrate:fresh` if you imported data)
- Runs the seeders (only the idempotent ones — Settings, Auth, Companies)
- Runs `php artisan config:cache route:cache view:cache`
- Sets permissions on `storage/` and `bootstrap/cache/`
- Installs the Nginx vhost from `~/api.conf` (after replacing `yourdomain.com`)
- Reloads Nginx

After this you should be able to `curl http://api.yourdomain.com/api/v1/health`
and get a 200 (the health endpoint is added by the deploy script).

---

## Phase 6 — Deploy the frontend (first time, ~10 min)

Option A: build on the server (simpler):

```powershell
LOCAL$ scp E:\CRM+ERP\Weblive\server-setup\05-deploy-frontend.sh deploy@<SERVER_IP>:~/
LOCAL$ scp E:\CRM+ERP\Weblive\env\frontend.env.production deploy@<SERVER_IP>:~/
LOCAL$ scp E:\CRM+ERP\Weblive\nginx\app.conf deploy@<SERVER_IP>:~/
```

Edit `~/frontend.env.production` on the server, set:
- `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1`

Then:

```bash
deploy@srv$ chmod +x ~/05-deploy-frontend.sh
deploy@srv$ sudo ~/05-deploy-frontend.sh
```

Script:
- Copies `~/frontend.env.production` → `/var/www/crm-erp/frontend/.env`
- Runs `npm ci`
- Runs `npm run build` → output in `/var/www/crm-erp/frontend/dist`
- Installs the Nginx vhost from `~/app.conf`
- Reloads Nginx

Option B (faster on small servers): build on Windows, scp the `dist/` folder.
See `scripts\build-frontend.bat` + `scripts\upload-to-server.bat`.

---

## Phase 7 — SSL with Let's Encrypt (~5 min)

```powershell
LOCAL$ scp E:\CRM+ERP\Weblive\server-setup\06-ssl-certbot.sh deploy@<SERVER_IP>:~/
```

```bash
deploy@srv$ chmod +x ~/06-ssl-certbot.sh
deploy@srv$ sudo ~/06-ssl-certbot.sh app.yourdomain.com api.yourdomain.com you@yourdomain.com
```

Certbot will:
- Issue certs for both subdomains
- Rewrite the Nginx vhosts to listen on 443 with the certs
- Add an HTTP→HTTPS redirect
- Install a renewal cron (twice daily check, auto-renews when <30 days)

**Now flip Cloudflare to Proxied (orange cloud)** if you're using it.

---

## Phase 8 — Queue worker + scheduler (~5 min)

```powershell
LOCAL$ scp E:\CRM+ERP\Weblive\server-setup\07-supervisor-queue.sh deploy@<SERVER_IP>:~/
LOCAL$ scp E:\CRM+ERP\Weblive\supervisor\crm-queue.conf deploy@<SERVER_IP>:~/
```

```bash
deploy@srv$ chmod +x ~/07-supervisor-queue.sh
deploy@srv$ sudo ~/07-supervisor-queue.sh
```

Script:
- Installs `supervisor` (if not already)
- Copies the queue worker config to `/etc/supervisor/conf.d/crm-queue.conf`
- Reloads supervisor and starts 2 worker processes
- Adds the Laravel scheduler to crontab:
  ```
  * * * * * cd /var/www/crm-erp/backend && php artisan schedule:run >> /dev/null 2>&1
  ```
- Adds a daily reminder dispatch:
  ```
  */5 * * * * cd /var/www/crm-erp/backend && php artisan reminders:dispatch >> /dev/null 2>&1
  ```

Verify:

```bash
deploy@srv$ sudo supervisorctl status
# crm-queue:crm-queue_00   RUNNING   pid 1234, uptime 0:00:05
# crm-queue:crm-queue_01   RUNNING   pid 1235, uptime 0:00:05
```

---

## Phase 9 — Backups (~5 min)

```powershell
LOCAL$ scp E:\CRM+ERP\Weblive\scripts\backup-db.sh deploy@<SERVER_IP>:~/
```

```bash
deploy@srv$ sudo mv ~/backup-db.sh /usr/local/bin/crm-backup-db.sh
deploy@srv$ sudo chmod +x /usr/local/bin/crm-backup-db.sh
deploy@srv$ sudo mkdir -p /var/backups/crm-erp
deploy@srv$ sudo chown deploy:deploy /var/backups/crm-erp
```

Add to crontab (`sudo crontab -e`):

```
15 2 * * * /usr/local/bin/crm-backup-db.sh
```

This dumps `crm_erp_prod` to `/var/backups/crm-erp/YYYY-MM-DD.sql.gz` at
02:15 every night and keeps the last 14 days.

**Off-server copy:** install `rclone` and configure your S3/B2/Drive remote,
then append to `backup-db.sh`:

```bash
rclone copy /var/backups/crm-erp/$(date +%F).sql.gz myremote:crm-erp-backups/
```

---

## Phase 10 — Verify (~10 min)

Open `https://app.yourdomain.com` in a browser. You should see the login
screen. Log in with the seeded admin:

- email: `admin@crm-erp.local` (or whatever you set as `ADMIN_SEED_EMAIL`)
- password: `ChangeMe@123` (or whatever you set as `ADMIN_SEED_PASSWORD`)

You'll be forced to change the password on first login.

Run through `checklist.md` to verify every critical path works in
production. Once green: tell users.

---

## Subsequent deploys (after first launch)

Every time you push code to the Git repo's `main` branch:

```bash
deploy@srv$ /var/www/crm-erp/Weblive/scripts/deploy.sh
```

The script does the safe sequence:
1. `git pull origin main`
2. `composer install --no-dev --optimize-autoloader`
3. `php artisan down --render="errors::503"` (maintenance mode)
4. `php artisan migrate --force`
5. `php artisan config:cache route:cache view:cache event:cache`
6. `cd frontend && npm ci && npm run build`
7. `sudo supervisorctl restart crm-queue:*`
8. `php artisan up`

Maintenance window per deploy: ~30–60 seconds (the npm build dominates).

---

## Rolling back

```bash
deploy@srv$ cd /var/www/crm-erp
deploy@srv$ git log --oneline -10        # find the last-good commit
deploy@srv$ git checkout <SHA>
deploy@srv$ /var/www/crm-erp/Weblive/scripts/deploy.sh
```

For DB rollbacks: restore from last night's backup with `restore-db.sh`.
Note: this is destructive; the day's transactions since 02:15 are lost.
Prefer to fix forward with a corrective migration when possible.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` on `api.yourdomain.com` | PHP-FPM not running | `sudo systemctl status php8.1-fpm`; `sudo systemctl restart php8.1-fpm` |
| `404` on every API route | `route:cache` ran without routes loaded | `php artisan route:clear` |
| `CORS error` in browser console | `CORS_ALLOWED_ORIGINS` wrong | Check `backend/.env`, then `php artisan config:cache` |
| Login works but `X-Company-Id` missing | Sanctum stateful list missing the domain | `SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com` |
| Queue not processing | Worker died, supervisor not restarting | `sudo supervisorctl restart crm-queue:*`; check `storage/logs/laravel.log` |
| Storage upload fails | Permissions on `storage/` | `sudo chown -R deploy:www-data /var/www/crm-erp/backend/storage && sudo chmod -R 775 /var/www/crm-erp/backend/storage` |
| Cert renewal failed | Cloudflare proxied during renewal | Temporarily switch to DNS only; re-run `certbot renew` |
| Login redirects to login | Session driver wrong / Redis down | `redis-cli ping` should return `PONG`; check `SESSION_DRIVER=redis` |
| 500 on every request | Likely `.env` or cache poisoned | `php artisan config:clear && php artisan cache:clear && php artisan route:clear` |

---

## After-launch hardening

Once the app is running and you've slept on it:

- Enable Cloudflare WAF "Bot Fight Mode" (free tier).
- Set up UptimeRobot pings on both subdomains.
- Add a `/health` endpoint to Laravel that touches DB + Redis, point Robot at it.
- Move `SESSION_DRIVER` to `redis` if not already.
- Consider an off-VPS read replica once your DB > 5 GB.
- Schedule a quarterly `apt upgrade` window.
