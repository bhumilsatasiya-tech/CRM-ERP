# CI/CD Setup Guide

## How it works

```
You push to main branch
       ↓
GitHub Actions runs (.github/workflows/deploy.yml)
       ↓
SSH into your server → runs scripts/deploy.sh
       ↓
git pull + composer install + migrate + npm build + reload PHP-FPM
       ↓
Site is live with new code
```

Plus: **Settings → Deploy button** inside the app triggers the same script manually.

---

## Step 1 — Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these 4 secrets:

| Secret name      | Value                                    |
|------------------|------------------------------------------|
| `SERVER_HOST`    | Your server IP (e.g. `142.93.10.5`)     |
| `SERVER_USER`    | SSH user (e.g. `deploy` or `root`)       |
| `SERVER_SSH_KEY` | Your **private** SSH key (full contents of `~/.ssh/id_rsa`) |
| `SERVER_PORT`    | `22` (or your custom SSH port)           |

---

## Step 2 — Set up the server

SSH into your server, then run:

```bash
# 1. Create deploy user (skip if using root)
adduser deploy
usermod -aG sudo deploy

# 2. Allow deploy user to reload PHP-FPM without password
echo "deploy ALL=(ALL) NOPASSWD: /bin/systemctl reload php8.1-fpm, /bin/systemctl reload php8.2-fpm" \
  >> /etc/sudoers.d/deploy

# 3. Clone your repo
mkdir -p /var/www/crm-erp
git clone https://github.com/bhumilsatasiya-tech/CRM-ERP.git /var/www/crm-erp
cd /var/www/crm-erp

# 4. Make deploy script executable
chmod +x scripts/deploy.sh

# 5. Copy and fill in backend .env
cp backend/.env.example backend/.env   # or create from scratch
# Edit backend/.env with your production DB, mail, etc.

# 6. Run first deploy manually
bash scripts/deploy.sh
```

---

## Step 3 — Push from local to trigger auto-deploy

```bash
git add .
git commit -m "your changes"
git push origin main        # ← this triggers GitHub Actions → server deploys
```

Watch it live: GitHub repo → **Actions** tab → click the running workflow.

---

## In-app Deploy button

Go to your live app → **Settings** page → scroll to bottom → **Deploy to Production**.

Only visible to `super-admin` users. Shows the full deploy log in a terminal-style panel after running.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Deploy script not found" | SSH into server, verify `/var/www/crm-erp/scripts/deploy.sh` exists and is executable |
| SSH permission denied in Actions | Check `SERVER_SSH_KEY` secret — must be the **private** key, not public |
| Migrations fail on deploy | Check `backend/.env` DB credentials on server |
| Frontend not updating | Check Node/npm version on server: `node -v` should be ≥ 18 |
