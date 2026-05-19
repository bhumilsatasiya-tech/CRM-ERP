# Production Architecture

What runs where, and how requests flow, once the app is deployed via this kit.

## Single-VPS topology (default)

```
                              ┌─────────────────────────────────────────┐
                              │              Cloudflare                 │
                              │  (DNS · CDN · WAF · DDoS shield)        │
                              │  proxied A: app + api → server IP       │
                              └──────────────────┬──────────────────────┘
                                                 │ HTTPS (443)
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Ubuntu 22.04 VPS — 2 vCPU / 4 GB RAM / Hetzner CX22 or equivalent          │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  Nginx 1.18                                                         │   │
│   │   ├─ vhost: app.yourdomain.com → /var/www/crm-erp/frontend/dist    │   │
│   │   │         (static React bundle, gzip, brotli, 1y cache)           │   │
│   │   └─ vhost: api.yourdomain.com → fastcgi → php-fpm (port 9000)     │   │
│   │             gzip on all JSON, 60s timeout for fan-out endpoints     │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  PHP-FPM 8.1 (dynamic process manager)                              │   │
│   │   - pm = dynamic, pm.max_children = 25, start = 5, min/max = 5/10  │   │
│   │   - OPcache enabled, 128 MB shared memory, 20 K files cached        │   │
│   │   - Sanctum + Spatie Permission + Activitylog all active            │   │
│   │   ↓                                                                  │   │
│   │  Laravel 9 at /var/www/crm-erp/backend                              │   │
│   │   - 23 modules under Modules/*                                       │   │
│   │   - .env: APP_ENV=production, DEBUG=false                           │   │
│   │   - config:cache, route:cache, view:cache all warmed                │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│         ↓                          ↓                          ↓             │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────────┐   │
│   │  MySQL 8.0   │         │  Redis 7     │         │  Local disk      │   │
│   │  crm_erp_    │         │  cache +     │         │  storage/app/    │   │
│   │  prod, port  │         │  session +   │         │  public          │   │
│   │  3306, app   │         │  queue       │         │  (or S3 if env   │   │
│   │  user        │         │  port 6379   │         │  flipped)        │   │
│   └──────────────┘         └──────────────┘         └──────────────────┘   │
│                                   ↑                                          │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  Supervisor — runs queue worker(s) reading from Redis              │   │
│   │   - crm-queue_00, crm-queue_01 (2 procs, --tries=3, --timeout=90)  │   │
│   │   - auto-restart on crash, captures stdout to /var/log/supervisor   │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  cron                                                                │   │
│   │   - * * * * *   php artisan schedule:run    (Laravel scheduler)    │   │
│   │   - */5 * * * * php artisan reminders:dispatch                      │   │
│   │   - 15 2 * * *  /usr/local/bin/crm-backup-db.sh                    │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  Security & ops                                                      │   │
│   │   - UFW: 22, 80, 443 only                                           │   │
│   │   - fail2ban watching SSH, Nginx 401/403                            │   │
│   │   - SSH key-only, deploy user nopassword sudo for narrow commands   │   │
│   │   - 4 GB swap file (for npm build memory spikes)                    │   │
│   │   - certbot --nginx auto-renew (twice-daily timer)                  │   │
│   └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ nightly mysqldump.gz
                                       ▼
                              ┌─────────────────────┐
                              │  Off-server backup  │
                              │  (rclone → S3 / B2  │
                              │   / Backblaze)      │
                              └─────────────────────┘
```

## Request flow

### Static asset request (`https://app.yourdomain.com/assets/index-abc.js`)

```
Browser → Cloudflare cache (HIT) → 200, served from edge
                ↓ MISS
         Nginx → /var/www/crm-erp/frontend/dist/assets/index-abc.js → 200
```

### API request (`POST https://api.yourdomain.com/api/v1/invoices`)

```
Browser
   ↓ (CORS preflight if needed, then POST with Bearer token + X-Company-Id)
Cloudflare (proxied, can WAF, doesn't cache by default for POST)
   ↓
Nginx :443 → vhost api.yourdomain.com → location ~ \.php$ → fastcgi_pass
   ↓
PHP-FPM worker
   ↓
Laravel kernel → routes/api.php (cached) → SanctumMiddleware → EnsureCompanyContext
   ↓
InvoiceController@store → StoreInvoiceRequest validate → InvoiceService::create
   ↓
   ├─ MySQL: insert invoices + invoice_items in transaction, SequenceService::next atomic
   ├─ stock_ledger row inserted via StockService::record
   ├─ event(InvoicePosted) fires → AutoJournalListener → JournalService writes JE
   ├─ Redis: invalidate list:invoices cache prefix
   └─ Activitylog: log row written
   ↓
InvoiceResource → JSON response → gzip → Nginx → Cloudflare → Browser
```

Typical latency on the default VPS:
- Cached frontend asset: 20–60 ms (Cloudflare edge)
- Light API call (lookup, list): 80–150 ms
- Heavy fan-out (Dashboard): 200–600 ms

## Why this shape

| Decision | Rationale |
|---|---|
| **Single VPS** instead of separate app/db tiers | Cost. A 2 vCPU box handles dozens of concurrent users comfortably. Split later if MySQL starts contending for CPU/memory. |
| **Nginx + PHP-FPM** instead of Apache | Lower memory per request; true multi-process; same config across distros. |
| **Static frontend bundle** instead of Node server | No frontend runtime to maintain; Cloudflare caches infinitely. |
| **Redis** for cache + session + queue | Single dependency does three jobs. Already covered by `phpredis` extension. |
| **Supervisor** instead of systemd for queue | Better restart semantics (numprocs, exit codes); the Laravel docs use it; works on Ubuntu out of the box. |
| **cron** for scheduler | Simplest. systemd timer is fine too but cron is more universally known. |
| **Cloudflare in front** | Free CDN, DDoS, WAF, SSL termination (optional — we still terminate at the VPS so cert is on both). Easy to remove later. |
| **Certbot via Nginx plugin** | Auto-edits the vhost, auto-renews; one less thing to script. |
| **No Docker** in the default path | Adds a layer for negligible benefit at this scale. The `docker/` folder has a containerized variant if you want it. |

## When to grow

| Trigger | Move |
|---|---|
| MySQL CPU > 60 % sustained | Move DB to managed (DO Managed MySQL, RDS, PlanetScale). |
| Concurrent users > 100, CPU > 70 % | Vertical bump to 4 vCPU / 8 GB. |
| File uploads > 20 GB | Move storage to S3/R2/B2 (env-only switch — `SHARED_STORAGE_DRIVER=s3`). |
| Need 5-nines uptime | Run two app servers behind a load balancer + shared Redis + managed DB. |
| Cross-region users | Cloudflare already handles asset CDN. For API, consider regional read replicas of MySQL. |

## What CAN'T this topology do

- **Zero-downtime deploys.** The deploy script uses `php artisan down` for
  ~30 s. To make it zero-downtime, switch to a blue-green release pattern
  (build into `/var/www/crm-erp-next`, swap symlink, reload php-fpm).
- **Multi-region writes.** MySQL is single-leader. If you genuinely need
  India + EU write latency, that's a re-architecture.
- **>10 GB MySQL on a 4 GB box.** Buffer pool will thrash. Move DB tier.
