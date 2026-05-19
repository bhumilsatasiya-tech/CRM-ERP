# CRM+ERP — Web Live Deployment Workspace

This folder is the **deployment kit** for taking the local CRM+ERP (currently
running on XAMPP at `E:\CRM+ERP\backend` + `E:\CRM+ERP\frontend`) onto a real
internet-facing server.

> Working directory at runtime: this folder stays on your Windows machine.
> The scripts inside it either run on Windows (build/upload helpers) or get
> uploaded and run on the Linux server (provisioning + deploy).

## Start here — read in this order

1. **`PRE-LAUNCH-DECISIONS.md`** — answer the questions in this file first.
   Domain, hosting provider, server size, mail provider, etc. Nothing else
   matters until these are decided.
2. **`DEPLOYMENT_GUIDE.md`** — the ordered, step-by-step playbook. Follow it
   top-to-bottom on launch day.
3. **`checklist.md`** — go/no-go list to tick off before pointing DNS at the
   server.

## What's in here

```
Weblive\
├── README.md                          ← you are here
├── DEPLOYMENT_GUIDE.md                ← step-by-step launch playbook
├── PRE-LAUNCH-DECISIONS.md            ← decisions you must make first
├── ARCHITECTURE.md                    ← what runs where in production
├── checklist.md                       ← pre + post launch checklist
│
├── env\
│   ├── backend.env.production         ← Laravel .env template for production
│   └── frontend.env.production        ← Vite .env template for production
│
├── nginx\
│   ├── api.conf                       ← vhost for api.yourdomain.com → Laravel
│   └── app.conf                       ← vhost for app.yourdomain.com → React SPA
│
├── server-setup\
│   ├── 01-provision-ubuntu.sh         ← initial Ubuntu hardening (firewall, swap, user)
│   ├── 02-install-stack.sh            ← nginx + php-fpm + mysql + redis + node
│   ├── 03-create-db.sh                ← MySQL DB + app user
│   ├── 04-deploy-backend.sh           ← first-time backend deploy
│   ├── 05-deploy-frontend.sh          ← first-time frontend build & publish
│   ├── 06-ssl-certbot.sh              ← Let's Encrypt SSL for both subdomains
│   └── 07-supervisor-queue.sh         ← install + start the queue worker
│
├── scripts\
│   ├── deploy.sh                      ← repeat-deploy on server (after first launch)
│   ├── backup-db.sh                   ← nightly MySQL dump (wire into cron)
│   ├── restore-db.sh                  ← restore from a dump file
│   ├── build-frontend.bat             ← Windows: build the React bundle locally
│   └── upload-to-server.bat           ← Windows: rsync/scp to the VPS
│
├── supervisor\
│   └── crm-queue.conf                 ← Supervisor config for `queue:work`
│
├── systemd\
│   └── crm-scheduler.timer            ← systemd alt for the cron scheduler
│
└── docker\                            ← OPTIONAL: containerized variant
    ├── docker-compose.yml
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    └── nginx.conf
```

## What changes vs. local

| Concern | Local (now) | Production (Weblive) |
|---|---|---|
| Web server | XAMPP Apache / `php artisan serve` | Nginx + PHP-FPM (true multi-process) |
| OS | Windows 10 | Ubuntu 22.04 LTS |
| PHP | 8.0.30 (XAMPP) | 8.1 (apt) — Laravel 9 supports both |
| DB | MySQL on `127.0.0.1`, root, no password | MySQL on localhost, dedicated app user, strong password |
| Cache / Session / Queue | `file` / `file` / `sync` | `redis` / `redis` / `redis` (with supervisord worker) |
| Storage | `E:/CRM+ERP/storage` | `/var/www/crm-erp/storage` (or S3 — env switch) |
| Frontend | `npm run dev` (Vite HMR) | `npm run build` → static files served by Nginx |
| URLs | `http://localhost:5173` + `http://127.0.0.1:8000/api/v1` | `https://app.yourdomain.com` + `https://api.yourdomain.com/api/v1` |
| TLS | none | Let's Encrypt (free, auto-renew) |
| Sanctum stateful domains | `localhost:5173` | `app.yourdomain.com` |
| Mail | log driver / none | real SMTP (SendGrid / SES / Brevo / Resend) |
| Backups | none | nightly mysqldump → off-server (S3 / B2 / rclone) |
| Process manager | manual terminals | Supervisor (queue) + cron (scheduler) |
| Logs | `storage/logs/laravel.log` | same + journalctl + Nginx access/error |

## What this kit does NOT do for you

- **Buy a domain.** You buy it from Namecheap / GoDaddy / Cloudflare / etc.
- **Provision the server.** You sign up at Hetzner / DigitalOcean / Vultr /
  Contabo / AWS Lightsail, pick Ubuntu 22.04, get root SSH access.
- **Migrate your existing local data.** Use `scripts\backup-db.sh` locally
  (variant) to dump from XAMPP MySQL, then import to the server. The
  guide walks through this.
- **Push your code to a Git remote.** Recommended: GitHub private repo. The
  deploy script pulls from there.

If you don't have any of these yet, see `PRE-LAUNCH-DECISIONS.md`.

## Quick deploy summary (once decisions are made)

1. Buy domain → point A records `app` + `api` at the server's IP.
2. Spin up a 2-vCPU / 4 GB RAM Ubuntu 22.04 VPS. Note the IP.
3. SSH in as root. Copy `server-setup/01-provision-ubuntu.sh` over, run it.
4. Reconnect as the `deploy` user it created. Run `02-` through `07-` in order.
5. From your Windows box, run `scripts\build-frontend.bat` then
   `scripts\upload-to-server.bat`.
6. Hit `https://app.yourdomain.com` — log in with the seeded admin.

Full version: **`DEPLOYMENT_GUIDE.md`**.
