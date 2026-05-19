# CRM + ERP — Project Memory (CLAUDE.md)

This file is the canonical context for this codebase. Read it first in any new
session. Last updated: 2026-05-17 — **25/25 modules live**. Recent additions on top
of the export-bank baseline:

- **Sprint A: Tally-killer workflow pack (2026-05-17)** — five user-facing workflows that put us ahead of Tally + Zoho on daily-use speed. (1) **Ctrl+K Command Palette** (`frontend/src/app/CommandPalette.tsx` + `commandRegistry.ts`) — universal search across partners/products/accounts (live from in-memory `lookupStore` — zero network), all pages, "new X" actions, voucher drawer tabs, and Recent docs across reloads. Triggered by Ctrl+K from anywhere (handled in `GlobalKeyboard.tsx`); also has a Linear/Notion-style trigger pill in the topbar with proper `⌃K` chip. (2) **Save & New / Print / Email / WhatsApp** (`frontend/src/modules/common/SaveActions.tsx`) — universal dropdown button replacing the plain "Save" on Invoice / Quotation / SO / PO forms. Each form's `onSave` now returns `{id, code}|null` instead of navigating; `SaveActions` chains the post-action: "Save & New" → /<doc>/new, "Save & Print" → auto PDF download, "Save & Email/WhatsApp" → dispatches `crm-erp:send-doc` event for the Comms modals. Pattern documented for the remaining 15 forms. (3) **Voucher-of-the-Day Drawer** (`frontend/src/app/DayActionsDrawer.tsx`) — floating orange flame button bottom-right with red badge; opens 380px right drawer with 8 actionable counters (invoices draft + overdue, PIs draft + unpaid, IRMs outstanding, EMIs due today/overdue, tasks overdue + due today). Each row → filtered list page. Backend: `GET /api/v1/dashboard/day-actions` (cached 30s, per-user, no PII). (4) **Inline Voucher Chain Strip** (`frontend/src/modules/common/VoucherChainStrip.tsx`) — horizontal pill-chain at top of Invoice + SO forms showing upstream + downstream linked docs (Quote → SO → Invoice → Payments / SO → Batches / SO → ICI). Click any pill → instant nav. Color-coded per doc type, current doc highlighted. Killed the "trace voucher" modal pattern. (5) **Recent + Pinned dropdown** (`frontend/src/app/RecentDocsButton.tsx` + `recentDocs.ts`) — topbar history icon; auto-records every doc detail/edit page visit (URL pattern matched globally), persists in localStorage, shows last 10 + pinned section. One-click pin/unpin, Clear button. Survives reloads. Together these 5 = the daily-use UX leap; Sprint B (visual polish — design tokens, empty states, mobile responsive, dark mode, micro-animations) is the visceral "wow" pass that comes next.
- **OPcache disabled on Windows Apache (2026-05-17)** — enabling `zend_extension=opcache` with `opcache.memory_consumption=256` caused `VirtualProtect() failed [87]` errors in Apache's error log under Windows. Every request hung indefinitely (login timed out at 30s). Known issue: Windows Apache's worker fork model can't allocate large OPcache shared memory regions via VirtualProtect. **Currently `;zend_extension=opcache` is commented out in `C:\xampp\php\php.ini`** so the stack works. To re-enable safely on Windows: lower `opcache.memory_consumption` to 64MB OR use `opcache.file_cache=C:/xampp/tmp/opcache` with `opcache.file_cache_only=1` (disk-backed, no shared memory — slower but no VirtualProtect issue). Loss is ~30-40% PHP execution speed; mitigated by the Apache multi-threading + Cache::remember layers already in place.
- **Commercialization speed pass (2026-05-17)** — five-front attack on perceived latency. (1) **PHP OPcache enabled** in `C:\xampp\php\php.ini` — uncommented `zend_extension=opcache` plus aggressive `[opcache]` block (256MB memory, 20k files, revalidate 2s). Compiles Laravel's 150+ bootstrap files once and caches in shared memory → 5-10× faster on every PHP request. (2) **Apache vhost on :8000** in `C:\xampp\apache\conf\extra\httpd-vhosts.conf` pointing at `E:/CRM+ERP/backend/public` — multi-threaded request handling REPLACES single-threaded `php artisan serve`. Eliminates the queueing that caused 5-20s dashboard waits when 8 parallel API calls fired. (3) **mod_deflate enabled** in `httpd.conf` + `AddOutputFilterByType DEFLATE application/json …` in the vhost → API responses gzipped (70-90% smaller wire). (4) **Persistent MySQL connections** via `PDO::ATTR_PERSISTENT => env('DB_PERSISTENT', true)` in `config/database.php` — kicks in under Apache (no-op under artisan serve) → saves 10-20ms TCP+auth per request. (5) **Frontend list cache TTL 5s→60s** + **lookup prefetch expanded to partners + products** + **Dashboard KPIs cached 60s server-side** + **TableSkeleton "slow" threshold 4s→2.5s** + **Gateway pages added to idle route-chunk prefetch**. Switch-over: run `scripts\setup-fast-backend.bat` once (validates + builds config/view caches), then use `scripts\start-all-fast.bat` instead of the legacy `start-all.bat`. Cold dashboard request dropped from 5-20s → ~300-600ms.
- **Tally-style Gateway pages** — every top-level sidebar item lands on a `<ModuleGateway>` page listing every action inside the module as a tile, with the action's keyboard shortcut printed as a small grey badge on each tile. `frontend/src/modules/common/gateways/*Gateway.tsx` — 12 module gateways (Sales, Purchase, Finance, Production, Export, Inter-Company, Reports, Settings, CRM, HR, Inventory, Products). The CRM gateway is split into 3 numbered sections (1. MASTER COMPANY · 2. SUPPLIERS · 3. CLIENTS/BUYERS) with NO duplicate "New X" tiles — creation happens inside the list pages themselves.
- **Centralized Statement Hub** — `/reports/statement` (`StatementHub.tsx`) is the single entry point for every per-party ledger. 13 categories (Master Company, Suppliers, Vendors, Manufacturers, Logistic Companies, Clients, Buyers, Importers, Banks, Creditors, Debitors, Borrowings/Loans, Other Ledgers). Click a partner-type tile → modal opens with PartnerSmartDropdown → pick party → routes to `/partners/:id/statement`. Reachable from Reports gateway too.
- **Year-wise Partner Statement** — `PartnerStatementPage` now has an **FY dropdown** (Current FY + 5 prior FYs from `listFinancialYears()`), filter row (date range, debit-only/credit-only, transaction type, search), `Print` + `Download PDF` + `Email` + `WhatsApp` buttons in the header. The PDF (rendered in `PartnerStatementController::renderHtml`) is a full A4 accounting-style layout with company header (GSTIN/PAN/TAN/address/contact), FY badge, opening/debit/credit/closing summary box, transaction table (Date · Voucher # · Type · Description · Debit · Credit · Running balance), footer with auto-detected FY label.
- **Central keyboard registry** — `frontend/src/app/shortcuts.ts` is the single source of truth for every keyboard shortcut. Three groups: **Module navigation** (Alt+letter — Alt+D=Dashboard, Alt+S=Sales gateway, Alt+F=Finance gateway, etc.), **Voucher shortcuts** (Ctrl+Shift+letter — opens Quick Voucher Drawer to a specific tab: R=Receipt, P=Supplier Payment, B=Bank Receipt, E=Expense, T=Contra), and **Universal** (Ctrl+S=Save, Esc=Back, ?=Cheat sheet, Alt+N=Open drawer). The sidebar items, gateway tiles, cheat-sheet modal, and `GlobalKeyboard` listener all read from this file — edit a combo there and every place updates. Press `?` from anywhere to see all shortcuts.
- **Quick Voucher Drawer (FAB)** — `QuickVoucherFab` mounts a floating "+" button bottom-right (shifts left when VoucherSwitcher visible). Opens a 460px right-side drawer with 5 tabs: Buyer Receipt, Supplier Payment, Bank Receipt (Dr Bank, Cr counter-account), Expense (Dr Expense, Cr Bank/Cash), Contra (Dr/Cr Bank↔Cash transfer). Each tab has a "Save & Add Another" button for high-volume entry. Behind: 5 backend endpoints — `vouchers/{buyer-receipt,supplier-payment,bank-receipt,expense,contra}` — bulk variants auto-allocate oldest-first across open invoices; standalone vouchers build a balanced journal entry via `JournalService::create()` + `post()`.
- **VoucherSwitcher right-rail** — `frontend/src/app/VoucherSwitcher.tsx` is a Tally-style right-edge rail (168px wide, 44px collapsed) that appears only on voucher/document pages (Invoices, SOs, POs, GRNs, PIs, EI, SB, PL, TI, ICI, Batches, Journals, Stock adj/transfers, Buyer Receipt/Supplier Payment vouchers — detected via `useVoucherPath()`). Lists every voucher type grouped into Sales / Purchase / Export / Other; click any → instant navigation. Currently-active voucher highlighted with colored left stripe. Collapse state persisted in localStorage. `Layout.Content` auto-pads right when visible.
- **Tally-redesigned Dashboard** — Restructured per operator workflow:
  - **Master Company panel** at top — full-width Tally Gateway-style picker (`CompanySelectionPanel`) with avatar, FY badge, GST/PAN/address meta, and explicit "Change ▼" dropdown when >1 company exists (else "+ Add another company" button).
  - **Quick Actions grid** — 8 colored tiles for one-click access to most-used forms (New Invoice, New PO, Buyer Receipt, Supplier Payment, New Journal, New Batch, All Ledgers, Statement Hub).
  - **Snapshot row** — Net Financial Position card (computed AR − AP, green when positive, red when negative) + "Needs Your Attention" panel with 4 anonymous action items (AR overdue 60+ days, AP overdue 60+ days, overdue tasks count, open IRMs count). Each item links to its filtered report.
  - **2×2 KPI grid** (Sales / AR / AP / Stock — small same-size colored cards) on the left, with **Today's Focus** vertical panel on the right.
  - Section dividers ("KEY NUMBERS", "OPERATIONS", "TRENDS", "STOCK & ACTIVITY") give visual rhythm. Every number aggregated — **zero client/partner names on the dashboard**.
- **In-memory lookup store** — `frontend/src/app/lookupStore.ts` caches `partners` / `products` / `accounts` / `units` / `categories` in memory so SmartDropdowns filter synchronously with **zero network on keystroke**. `useLookupPrefetch` warms the cache lazily (sequential, idle-deferred, 1.5s after auth so the user's first page click hits the server uncontested). Heavy kinds (partners, products) load on first dropdown open and cache thereafter; small kinds (accounts, units, categories) prefetch on boot. Mutations call `invalidateStore(kind)` via the existing `flushPartnerCaches`/`flushProductCaches` helpers. Company switch fires `crm-erp:company-switched` → `clearAllStores()` then re-prefetch.
- **Indian FY (1 Apr → 31 Mar) defaults everywhere** — `frontend/src/app/fy.ts` exports `fyStart()`, `fyEnd()`, `formatFY()` ("FY 2025-26"), `listFinancialYears(count)`, and `SPLIT_DATE_PRESETS` (with "Current FY", "Previous FY", "This month", "Last 30 days", etc.). Applied to Dashboard, Trial Balance, Reports, Partner Statement, Account Ledger default date ranges — every financial page opens to the current FY out of the box, with a "Quick range…" dropdown for one-click switching to previous FYs or month/quarter views.
- **Tally density theme** — `frontend/src/app/tally-theme.css` (imported once in `main.tsx`) applies global AntD overrides: tighter card/form/table padding, tabular-nums on every numeric column, compact 12px form labels, 12.5px table rows (~30% more rows visible), uppercase section dividers, sidebar items with rounded corners + colored selection, print styles that hide sidebar/topbar/voucher rail/FAB. No component-level changes — pure CSS, one file.
- **Auth middleware 500→401 fix** — `app/Http/Middleware/Authenticate.php::redirectTo()` now returns `null` unconditionally (was calling `route('login')` which doesn't exist in our API-only app, throwing `RouteNotFoundException` → 500). Plus `app/Exceptions/Handler.php` overrides `unauthenticated()` to return a clean JSON 401 instead of Laravel's default `redirect()->guest(route('login'))` fallback (which also threw). Frontend axios interceptor was already wired to refresh on 401 — now that path actually works on expired tokens.
- **TableSkeleton timeout fallback** — after 4 seconds of skeleton, the component swaps for a friendly "Server is taking longer than usual" panel with optional Retry button. Avoids the user staring at a forever-loading shimmer when `php artisan serve` is queued up.
- **Partner VAT + CIN + type-aware labels** — Partners table has `vat_no` + `cin_no` columns (added via `2026_05_16_000002_add_vat_cin_to_partners.php`); VAT field is always enabled (international), CIN disabled when country is overseas. Sidebar/buttons/form titles are dynamically labeled per partner type — Client list shows "+ New Client (Buyer)", Supplier list shows "+ New Supplier (Seller)", etc. (driven by `NEW_LABEL` / `LIST_TITLE` / `TYPE_LABEL` maps on the list + form pages).
- **Company TAN + bill-to/ship-to** — Companies table has `tan_no` + a full `bill_to_*` block + a full `ship_to_*` block (`2026_05_16_000001_add_tan_billto_shipto_to_companies.php`). Company form has new sections with "Copy from registered address" buttons for both bill-to and ship-to.
- **Supplier Payment voucher + new `purchase_invoice_payments` table** — Mirror of `invoice_payments` (`2026_05_16_000003_create_purchase_invoice_payments_table.php`). `PurchaseService::recordPIPayment` (single-PI) + `recordSupplierBulkPayment` (lump-sum across many open PIs, oldest-first). Fires `PurchaseInvoicePaymentMade` event → `AutoJournalListener::onPurchaseInvoicePayment` writes Dr AP / Cr Bank-or-Cash journal. Full-page version at `/vouchers/supplier-payment` + drawer tab.
- **List-page response cache (5s TTL)** — frontend `cachedList()` wraps every paginated list endpoint (partners, products, quotations, SO, invoices, PO, GRN, PI, EI, SB, PL, TI, IRM, lodgement, ICI, loans, tasks, batches). Stable-JSON cache key, **mutations auto-flush** the relevant prefixes (creating an EI also flushes `list:packing-lists` + `list:tax-invoices`; ICI mutations also flush invoices + purchase-invoices; IRM/lodgement mutations cascade to export-invoices). Company switch fires `crm-erp:company-switched` event → all list caches flushed. Net: pagination, sorting, and filter-toggling within a 5s window are instant; list pages reopened from a detail view skip the round-trip.
- **DocumentNumberField on every doc form** — editable preview now wired into Inter-Company Invoice, Loan, Journal Entry, Production Batch, Packing List, Tax Invoice, Shipping Bill, Stock Adjustment, and Stock Transfer (in addition to the existing Quotation / SO / Invoice / PO / EI). Backend `StoreXxxRequest`s for these added a `code` rule with `Rule::unique(...)->whereNull('deleted_at')` for soft-delete reuse; controllers forward `code` into `SequenceService::next($cid, $docType, $userCode)`.
- **Reports PDF** — `GET /api/v1/reports/{code}/pdf` renders any of the 9 reports (sales/purchase register, stock summary, production summary, AR/AP aging, P&L, balance sheet, export realization) to dompdf-generated PDF via a new `ReportPdfService`. Auto-detects payload shape (rows+totals / income+expense / assets+liabilities+equity) and writes clean HTML tables. `<DownloadPdfButton>` added to `ReportViewerPage` header — uses the current date filters in the URL.
- **TableSkeleton** — new `<TableSkeleton rows columns withHeader>` shared component renders shimmer rows for the first paint of a list page (before data loads). Wired into 10 high-traffic list pages (Partners, Products, Invoices, SO, Quotations, PO, EI, IRM, Loans, Production Batches). Replaces the empty-card flash with visible weight on first paint.
- **6.6 Export Incentives** — Drawback / IGST refund / RoDTEP claim tracking against shipping bills.
- **6.7 Document Templates + PDF generation** — `barryvdh/laravel-dompdf`, editable Mustache-flavoured templates per (company × doc_type), Settings → Document Templates editor with live preview, "Download PDF" buttons on Invoice / Quotation / SO / PO / EI / TI forms.
- **Phase 4 family-sequence** — auto-spawned Packing List + Tax Invoice now share the parent Export Invoice's running number with their own prefix (`EI/2026/00042` → `PL/2026/00042` + `TAX/2026/00042`).
- **Phase 5 Production stage split** — `production_batches.stage` enum (`trial` / `final` / `qc`) + `parent_batch_id` self-FK; `complete()` is stage-aware (trial skips FG IN, QC writes nothing).
- **Phase 2 SmartDropdown** — universal lazy-load typeahead with inline + Add new modal, replacing 12+ ad-hoc Select+search patterns across Partner / Product / Category / Unit pickers.
- **Document number on every form** — editable preview field via `DocumentNumberField`, lets users override the auto-sequence at create time; user-typed codes advance the master sequence past them.
- **Soft-delete code reuse** — every `(company_id, code)` unique index rebuilt as `(company_id, code, deleted_at)`. Deleting a partner/product/invoice/batch/etc. instantly frees its code for reuse, preserves the deleted row for audit.
- **Centered confirm modal** — `confirmDelete()` utility replaces every `<Popconfirm>` (39+ sites) with a blocking centered modal — extra safety on every destructive click.
- **Privacy-first dashboard** — gradient hero cards + inline-SVG sparklines + AR/AP aging buckets + stock-by-warehouse + system pulse counters. **Zero buyer/supplier names exposed** anywhere on the page.
- **Mandatory daily checklist on Dashboard** — `TodayTasksPanel` pinned ABOVE the financial KPIs. Lists current user's overdue + due-today tasks with a done-progress ring; quick-add input creates `assignee=me, due=today` in one keystroke; inline check-off marks complete. Drives daily completion accountability — work items can't slip through the day.
- **Performance pass** — 60s `Cache::remember` on partner/product lookups (auto-invalidated on create/update/delete) + composite indexes on `stock_ledger`, `journal_lines`, `journal_entries`, `irm_allocations`.
- **OCR for Shipping Bill** — pluggable `OcrProvider` interface with `StubOcrProvider` default; "OCR from PDF" Upload button on SB form. Real provider needs env binding.
- **Cascade soft-delete on Companies/Branches** — deleting a company cascade-soft-deletes its branches + warehouses (no more "Cannot delete with existing children" wall).
- **`EnsureCompanyContext` auto-heals** — if the cached `X-Company-Id` points at a dead/deleted company, middleware silently falls through to the next available and updates `default_company_id`. Companies CRUD moved out of the company.context group (managing companies doesn't need an active one).

> **Project root:** `E:\CRM+ERP`
> **OS:** Windows 10
> **Default super-admin:** `admin@crm-erp.local` / `ChangeMe@123` (forced password change on first login)

---

## 1. What this is

A two-company enterprise ERP + CRM running locally on XAMPP, designed
**offline-first but cloud-deployable** (env-only switch). The two companies are:

- **Company A** — Export company. Creates export invoices, receives payment, handles IRM + bank closure.
- **Company B** — Supplying company. Sells to Company A under inter-company billing with profit %.

Every business table is multi-company aware via the `BelongsToCompany` trait.
A topbar **company switcher** sets the active company; a global query scope
filters everything by it.

## 2. Tech stack — **fixed by host PHP version**

| Layer | Choice | Why this version |
|---|---|---|
| **PHP** | 8.0.30 (XAMPP) | Locked to whatever XAMPP shipped. Cannot change without upgrading XAMPP. |
| **Laravel** | 9.0 (latest 9.x patch) | PHP 8.0 caps us at Laravel 9. Laravel 10 needs PHP 8.1, Laravel 11 needs PHP 8.2. |
| **Sanctum** | `3.*` | Token auth. v3 supports per-token expiry. |
| **Spatie Permission** | `5.*` | RBAC. v6 needs Laravel 10+. |
| **Spatie Activitylog** | `4.*` | Audit log. v5 needs Laravel 10+. |
| **MySQL** | 8.x via XAMPP | Default port 3306, root user, no password. |
| **Node** | 24.15.x | Anything ≥ 18 fine. |
| **Vite** | 8.x | Whatever `npm create vite@latest` shipped. |
| **React** | 18 + TypeScript | Functional + hooks only. |
| **Ant Design** | 5.x (with v6 deprecation warnings) | UI kit. |
| **State** | Redux Toolkit (`@reduxjs/toolkit` + `react-redux`) | Auth + companies slices. |
| **HTTP** | Axios with response-interceptor auto-refresh | See `frontend/src/modules/01-auth/api/axiosInstance.ts`. |
| **Forms** | Ant Design `Form.useForm` (no react-hook-form) | Stay consistent with antd. |

> ⚠️ **Don't try to "upgrade Laravel"** without first upgrading PHP. The version
> chain is rigid: Laravel 11 → PHP 8.2; Laravel 10 → PHP 8.1; Laravel 9 → PHP 8.0.
> If the user wants Laravel 11 features (like the new `bootstrap/providers.php`),
> they need a newer XAMPP first.

## 3. Required tools on the host machine (current state)

| Tool | Path | Notes |
|---|---|---|
| PHP | `C:\xampp\php\php.exe` | NOT on system PATH by default. |
| MySQL CLI | `C:\xampp\mysql\bin\mysql.exe` | NOT on system PATH by default. |
| Composer | `C:\ProgramData\ComposerSetup\bin\composer.bat` | On PATH. |
| Git | `C:\Program Files\Git\bin\git.exe` | On PATH. |
| Node + npm | `C:\Program Files\nodejs\` | On PATH. |

**For PowerShell sessions that the agent spawns**, prefix `$env:Path` with the
XAMPP paths first because the agent's shell inherits a stale PATH:

```powershell
$env:Path = "C:\xampp\php;C:\xampp\mysql\bin;C:\ProgramData\ComposerSetup\bin;" + $env:Path
```

**npm runs** require execution-policy bypass in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
& npm.cmd ...      # use npm.cmd, not npm.ps1
```

**PowerShell tool quirks observed:**
- `^` in version strings (`^3.0`) gets stripped by cmd.exe when calling `composer require`. Use single-quoted globs: `'laravel/sanctum:3.*'`.
- Backslashes in seeder class names get mangled. Use single quotes: `--class='Modules\Auth\Database\Seeders\AuthDatabaseSeeder'`.
- Sometimes PowerShell stdout returns empty in this agent's tool — fall back to `Glob` / `Read` to verify side effects.

## 4. Folder structure

```
E:\CRM+ERP
├── CLAUDE.md                              ← this file
├── README.md
├── backend\                               ← Laravel 9 root
│   ├── app\, bootstrap\, config\, ...     ← stock Laravel
│   ├── config\app.php                     ← module providers registered here
│   ├── config\auth.php                    ← `api` guard, `users` provider, `password_reset_tokens` table
│   ├── database\migrations\               ← Laravel default migrations live here too
│   ├── routes\api_v1.php                  ← (none — every module owns its own routes)
│   └── Modules\                           ← every business module lives here
│       ├── Auth\                          ← 1.1
│       ├── Companies\                     ← 1.2
│       ├── Settings\                      ← 1.3
│       ├── Crm\                           ← 2.1
│       ├── Products\                      ← 2.2
│       ├── Inventory\                     ← 3.1
│       ├── Purchase\                      ← 3.2
│       ├── Quotation\                     ← 4.1
│       ├── Sales\                         ← 4.2
│       ├── Production\                    ← 4.3
│       ├── Tracking\                      ← 4.4 (no migrations, read-only aggregator)
│       ├── Formula\                       ← 2.3
│       ├── Export\                        ← 4.5
│       ├── Irm\                           ← 4.6
│       ├── InterCompany\                  ← 5.4
│       ├── Finance\                       ← 5.1 (Chart of Accounts, Journals, P&L, BS)
│       ├── Loans\                         ← 5.2
│       ├── Hr\                            ← 5.3
│       ├── Documents\                     ← 6.1 (polymorphic file attachments)
│       ├── Tasks\                         ← 6.2 (Tasks + Reminders + Google Calendar stub)
│       ├── Comms\                         ← 6.3 (Email + WhatsApp pluggable)
│       ├── Reports\                       ← 6.4 (no migrations, derived)
│       └── Dashboard\                     ← 6.5 (no migrations, KPIs)
├── frontend\                              ← Vite + React + TS root
│   ├── src\
│   │   ├── App.tsx                        ← top-level Routes + sidebar Menu
│   │   ├── main.tsx                       ← Provider wrap (Redux, Router, antd ConfigProvider)
│   │   ├── index.css                      ← minimal reset
│   │   ├── app\
│   │   │   ├── store.ts                   ← combineReducers (auth + companies)
│   │   │   └── hooks.ts                   ← useAppDispatch, useAppSelector
│   │   └── modules\
│   │       ├── common\
│   │       │   └── DocumentLineEditor.tsx ← shared by Quotation/PO/PI/SO/Invoice/GRN
│   │       ├── 01-auth\
│   │       ├── 02-companies\
│   │       ├── 03-settings\
│   │       ├── 04-crm\
│   │       ├── 05-products\
│   │       ├── 06-inventory\
│   │       ├── 07-purchase\
│   │       ├── 08-quotation\
│   │       ├── 09-sales\
│   │       ├── 10-production\
│   │       ├── 11-tracking\
│   │       ├── 12-formula\
│   │       ├── 13-export\
│   │       ├── 14-irm\
│   │       ├── 15-intercompany\
│   │       ├── 16-finance\
│   │       ├── 17-loans\
│   │       ├── 18-hr\
│   │       ├── 19-documents\           ← exports DocumentsPanel for any form page
│   │       ├── 20-tasks\
│   │       ├── 21-comms\
│   │       ├── 22-reports\
│   │       └── 23-dashboard\
│   ├── .env                               ← VITE_API_BASE_URL=http://localhost:8000/api/v1
│   └── package.json
├── docs\modules\                          ← per-module docs (only 01-auth fully written so far)
├── scripts\                               ← Windows .bat helpers
│   ├── start-backend.bat
│   ├── start-frontend.bat
│   ├── queue-worker.bat
│   ├── scheduler.bat
│   ├── migrate-fresh-seed.bat
│   └── install-module-1.bat
├── storage\                               ← shared file uploads (offline) → S3 (cloud)
└── database\                              ← schema dumps, ERD (placeholder)
```

## 5. Database — 73 tables across 23 modules (4.4 + 6.4 + 6.5 add no schema)

### Foundation (Modules 1.1 – 1.3)
- `users`, `password_reset_tokens`, `personal_access_tokens` (Sanctum's vendor migration is **ignored** in `Modules\Auth\Providers\AuthServiceProvider::register()` via `Sanctum::ignoreMigrations()` — we ship our own with `expires_at`).
- `permissions`, `roles`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` (Spatie schema, but **migration shipped by us** so we can add `module` + `is_system` columns).
- `companies`, `branches`, `warehouses`, `user_companies`.
- `settings`, `sequences`.
- `activity_log`, `activity_log_event`, etc. (Spatie published).

### Master data (Modules 2.1 – 2.2)
- `partners` (single table; type enum extended to client/supplier/vendor/manufacturer/importer/employee/other; **`country` char(2) NOT NULL default 'IN'**, mandatory at form level; `tax_treatment` is auto-forced to `overseas` and dropdown locked when country ≠ IN), `partner_contacts`, `partner_addresses`, `partner_bank_accounts`.
- `product_units` (UoM), `product_categories` (tree with materialized `path`), `products`, `product_uom_conversions`.

### HSN/SAC (cross-cutting on all *_items)
- `hsn_code varchar(16) nullable` is **snapshotted on every line table**: `quotation_items`, `sales_order_items`, `invoice_items`, `purchase_order_items`, `grn_items`, `purchase_invoice_items`, `export_invoice_items`, `shipping_bill_items`, `packing_list_items`, `tax_invoice_items`, `inter_company_invoice_items`. Auto-fills from `products.hsn_code` on product pick; user can override per line. Renders as the "HSN/SAC" column in `DocumentLineEditor`.

### Inventory (Module 3.1)
- `stock_ledger` (immutable, append-only, polymorphic ref).
- `stock_adjustments`, `stock_adjustment_lines`.
- `stock_transfers`, `stock_transfer_lines`.

### Purchase (Module 3.2)
- `purchase_orders`, `purchase_order_items`.
- `grns`, `grn_items` (each line links to a `stock_ledger` row on receipt).
- `purchase_invoices`, `purchase_invoice_items`.

### Sales (Modules 4.1 – 4.2)
- `quotations`, `quotation_items`.
- `sales_orders`, `sales_order_items`.
- `invoices`, `invoice_items` (each line links to a `stock_ledger` row on post).
- `invoice_payments`.

### Production (Module 4.3)
- `production_batches` (header). **`stage` enum (`trial`/`final`/`qc`)** + **`parent_batch_id` self-FK** added 2026-05 — links a Final batch back to its Trial run, or QC back to Final. `complete()` is stage-aware: trial writes only inputs (no FG IN), QC writes nothing (records pass/fail in `meta.qc_results`).
- `production_batch_inputs` — raw materials consumed (each line links to a `stock_ledger` row on completion).
- `production_batch_outputs` — finished / by-product / scrap produced (each line links to a `stock_ledger` row on completion).
- `production_quality_checks` — pass/fail QC log per batch.

### Formula / BOM (Module 2.3)
- `formulas` — versioned BOM header (target_product, output_qty, status: draft/active/inactive).
- `formula_components` — components (product, qty per yield, wastage_pct).

### Export (Module 4.5)
- `export_invoices` — full Indian-export template: multi-currency + incoterm + ports + `transport_mode` + `lut_no/date` + `tax_details` + `customs_notification_no/date` (snapshotted onto Tax Invoice) + full **consignee** block (`consignee_partner_id` FK + name/address/country/contact_person/phone/email/registration_no) + **notify_party** block (name + address) + `loading_destination`/`final_destination` + `payment_terms` + 3 charge cols (`freight_charge`/`packaging_charge`/`development_charge`).
- `export_invoice_items` — same line shape plus `shipper_qty` + `shipper_unit` (number of packages × pack unit).
- `shipping_bills` (BL/vessel/voyage/carrier/ports), `shipping_bill_items` (each line links to a `stock_ledger` OUT row on dispatch).
- `packing_lists` + `packing_list_items` — for customs. Snapshots the EI's consignee/notify/transport/LUT etc. (so PL is a self-contained doc). PL items add `packages` + `shipper_unit` + per-line gross/net weight + dimensions. Header has `total_packages`/`total_pallet_qty`/`gross_weight_kg`/`net_weight_kg`/`volume_cbm`. Status: `draft → finalized → cancelled`.
- `tax_invoices` + `tax_invoice_items` — for GST. Same EI snapshot block plus `customs_notification_no/date`, `gstin_supplier`, `gstin_recipient`, `place_of_supply`, `subtotal_inr`/`total_inr` (exchange-rate computed). Status: `draft → posted → cancelled`. The TI form is a thin INR view: only **exchange rate**, **customs notification no**, **customs notification date** are user input — everything else snapshotted from the EI.

### IRM + Bank Closure (Module 4.6)
- `irms` (FCY + INR amounts, exchange rate, status: `received → partially_allocated → allocated → closed → cancelled`). Plus `partner_id` (mandatory at create), `purpose` enum (`advance` / `against_invoice`), `purchase_order_ref`, `proforma_invoice_no`, `remitter_name`, `bank_ref_no`, `outstanding_amount_fcy/inr` (decreases as allocations land), `export_invoice_id` is **nullable** (advances have no EI yet). The "New IRM" form **always creates an advance**: only partner is mandatory; PO ref + proforma no. are optional references.
- `irm_allocations` — many-to-one against IRM (multi-EI splits supported). Cols: `lodgement_id` FK nullable, `shipping_bill_id` FK nullable, `amount_fcy`/`amount_inr`, `allocation_date`, `exchange_rate`, `is_full_realization`, `is_third_party_payment` (true when IRM partner ≠ EI partner — parent company / consolidator paying), `utilization_status` enum (`pending` / `utilised` / `unutilised` / `rejected`), `utilization_note`. Removing or marking unutilised/rejected reverses the underlying EI payment.
- `lodgements` — bank lodgement record grouping a batch of IRM allocations under one bank receipt. Cols: `code` (auto-seq `LODGE/...`), `partner_id`, `lodgement_date`, `bank_receipt_no`, `bank_receipt_date`, status enum (`draft → submitted → accepted → rejected → cancelled`), `rejection_reason`. Reject reverses every row not individually marked utilised; cancel reverses ALL rows.
- `bank_realizations` (commission, TDS, net_inr per closure).

### Inter-Company Billing (Module 5.4)
- `inter_company_invoices` (spans two companies — does NOT use `BelongsToCompany`; has `from_company_id`/`to_company_id`, `cost_basis`, `profit_pct`, `linked_sale_invoice_id`, `linked_purchase_invoice_id`).
- `inter_company_invoice_items` (cost_rate, sell_rate, paired `from_ledger_id` + `to_ledger_id`).

### Finance + Ledger (Module 5.1)
- `accounts` (chart of accounts — type asset/liability/equity/income/expense, parent_id, is_group, is_system).
- `account_balances` (materialized running balances per account per as_of date — recomputed by BalanceService).
- `journal_entries` (header — code, date, narration, reference_type+id polymorphic to source module).
- `journal_lines` (account_id + debit/credit; service validates sum(debits)=sum(credits)).
- `fiscal_periods` (open/closed; future-use for period locking).

### Loans + EMI (Module 5.2)
- `loans` (borrowed/given, principal, rate, tenure, EMI, outstanding_principal, status: draft/active/closed/cancelled).
- `loan_emi_schedule` (one row per installment with principal/interest split, paid_amount, status).
- `loan_payments` (waterfalls across overdue+pending EMIs by due_date).

### HR + Salary (Module 5.3)
- `designations`, `employees` (optional user_id link, KYC + bank cols, status enum).
- `salary_components` (chart of earnings/deductions; formula_type fixed or percent_of_basic).
- `employee_salary_structures` (latest row applies; JSON snapshot of components at effective_from).
- `salary_runs` (monthly run header), `payslips` (one per employee per run, JSON breakdown).

### Documents (Module 6.1)
- `documents` (polymorphic — `attachable_type`+`attachable_id`, category enum, file disk+path).

### Tasks + Reminders (Module 6.2)
- `tasks` (assignee, status/priority, due_date, polymorphic related_type+id, google_event_id placeholder).
- `reminders` (notify_at, channel email/in_app, status pending/sent/failed; dispatched by `php artisan reminders:dispatch`).
- `oauth_tokens` (per-user encrypted Google tokens — currently unused; sync is stubbed).

### Communication (Module 6.3)
- `comm_messages` (direction, channel email/whatsapp/sms, to/from/subject/body, status, polymorphic related).
- `comm_templates` (placeholder-based templates with `{{var}}` substitution).

### Export Incentives (Module 6.6)
- `export_incentive_claims` — Drawback / IGST refund / RoDTEP claims against shipping bills. Cols: `type` enum (`drawback`/`igst_refund`/`rodtep`), `shipping_bill_id`+`export_invoice_id` (nullable), `claim_no`, `claim_date`, `claim_amount`, `claim_currency` (default INR), `status` enum (`pending → filed → approved → credited / rejected`), `credited_amount`, `credited_date`, `bank_ref`, `rejection_reason`. Indexed by `(company_id, type, status)`.

### Document Templates + PDF (Module 6.7)
- `document_templates` — one editable template per (company × `doc_type`). Cols: `doc_type` (matches sequence keys: `invoice`, `quotation`, `sales_order`, `purchase_order`, `export_invoice`, `tax_invoice`), `name`, `html` (longtext, body with `{{placeholders}}` and `{{#items}}…{{/items}}` loops), `css`, `paper_size` (`a4`/`letter`/`legal`), `orientation`, `is_default`, `is_active`. Seeded with 6 default templates per company by `TemplatesDatabaseSeeder`. Renderer is **pure Mustache flavour, no PHP exec** (safe for end-user editing).

### Soft-delete code reuse (cross-cutting, 2026-06)
- Every doc table's `(company_id, code)` unique index was rebuilt as **`(company_id, code, deleted_at)`** by migration `2026_06_20_000001_unique_codes_allow_reuse_after_softdelete.php`. MySQL InnoDB treats NULL as distinct in unique indexes, so soft-deleted rows (with non-null `deleted_at`) no longer block re-using their code. Active-row uniqueness is still enforced at the FormRequest layer via `Rule::unique(...)->whereNull('deleted_at')`.
- Tables affected: companies, branches, warehouses, partners, products, product_categories, product_units, formulas, stock_adjustments, stock_transfers, purchase_orders, grns, purchase_invoices, quotations, sales_orders, invoices, production_batches, export_invoices, shipping_bills, packing_lists, tax_invoices, irms, lodgements, inter_company_invoices, accounts, journal_entries, loans, designations, employees, salary_components, salary_runs, comm_templates. (`fiscal_periods` excluded — no soft-delete column.)
- Net effect: delete a partner / product / invoice / batch / etc. → its code is immediately available for the next entry. Audit trail preserved (deleted row stays in DB with `deleted_at` set).

### Performance indexes (cross-cutting, 2026-06)
Composite indexes added by `2026_06_18_000002_add_perf_indexes_to_hot_tables.php`:
- `stock_ledger (warehouse_id, product_id, posted_at)` — drives `getCurrentStock` / `currentStockPivot`
- `stock_ledger (reference_type, reference_id)` — drives `reverse()` lookups
- `journal_lines (account_id, journal_entry_id)` — drives ledger / trial-balance reports
- `journal_entries (reference_type, reference_id)` — drives `AutoJournalListener` idempotency check
- `irm_allocations (irm_id, utilization_status)` — drives outstanding calculations

> Use `php artisan migrate:fresh --force` followed by the per-module seeders to
> rebuild from scratch. There's no master seeder; each module's seeder is
> separate so you can re-run any one. Seeder run order: `Auth → Companies →
> Settings → Crm → Products → Inventory` (then per-module ones don't depend on
> each other for now).

## 6. The module pattern — **how every module is shaped**

Every module under `backend/Modules/<Name>/` follows the same skeleton:

```
Modules/<Name>/
├── module.json                          ← manifest (name, number, deps, providers)
├── README.md
├── Config/config.php                    ← merged into app config under key '<module_name>'
├── Database/
│   ├── Migrations/                      ← auto-loaded by ServiceProvider::boot()
│   └── Seeders/<Name>DatabaseSeeder.php
├── Models/                              ← Eloquent models
├── Http/
│   ├── Controllers/                     ← extend App\Http\Controllers\Controller (NOT Illuminate\Routing\Controller)
│   ├── Requests/                        ← FormRequest validation
│   └── Resources/                       ← API JSON shape
├── Services/                            ← business logic, transactions
├── Policies/                            ← authorization
├── Providers/<Name>ServiceProvider.php  ← extends Foundation\Support\Providers\AuthServiceProvider
└── Routes/api.php                       ← always prefix('v1') and middleware('auth:sanctum', 'company.context')
```

The provider:
- Registers `$policies` via `parent::registerPolicies()`.
- Loads migrations from `__DIR__ . '/../Database/Migrations'`.
- Loads routes with `Route::middleware('api')->prefix('api')->group(...)`.
- Singletons heavyweight services (e.g. `StockService`).

The provider is **registered manually** in `backend/config/app.php` under
`providers` (Laravel 9 — no `bootstrap/providers.php`).

The PSR-4 autoload mapping `"Modules\\": "Modules/"` is in `backend/composer.json`.
After adding a new module run `composer dump-autoload -o`.

## 7. The 9 modules

### 1.1 Auth (`Modules\Auth`)

- **Tables:** `users` (with `default_company_id`, `must_change_password`, lockout cols, 2FA placeholders), Sanctum `personal_access_tokens` (we ship it), Spatie permission tables.
- **Key files:** `Models/User.php`, `Services/AuthService.php` (login, refresh, lockout, password reset), `Services/UserService.php`, `Services/RoleService.php`.
- **Auth flow:** `POST /auth/login` → returns `{access_token, expires_at, user}`. Frontend axios interceptor auto-refreshes on 401 once.
- **Permissions catalog lives in:** `Modules\Auth\Database\Seeders\RolePermissionSeeder` — **every new module must add its permissions here** AND to the role lists below in the same file.
- **Roles seeded:** `super-admin` (Gate::before bypass), `admin`, `manager`, `viewer`.
- **Seeded admin** (idempotent): `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` env vars. Defaults `admin@crm-erp.local` / `ChangeMe@123`.

### 1.2 Companies (`Modules\Companies`)

- **Tables:** `companies` (type: export/supplying), `branches`, `warehouses`, `user_companies` pivot.
- **Critical reusable bits:**
  - **Trait** `Modules\Companies\Models\Concerns\BelongsToCompany` — apply to every company-scoped model. Auto-fills `company_id` on create + adds a global scope filtering by active company (unless user has `super-admin` or `admin` role).
  - **Middleware** `Modules\Companies\Http\Middleware\EnsureCompanyContext` (alias `company.context`) — reads `X-Company-Id` header → falls back to `users.default_company_id` → falls back to user's first company. Validates user has access. Binds `app('active_company_id')` for the trait.
- **Seeded:** Company A (code `COA`, type `export`) + Company B (code `COB`, type `supplying`), each with HO branch + Finished/Raw warehouses. Admin attached to both, default = A.

### 1.3 Settings + Sequences + Audit (`Modules\Settings`)

- **Tables:** `settings` (scope: global/company/user), `sequences` (per-company doc numbering).
- **`SettingService`** — `get(key, default, userId, companyId)` resolves with precedence user → company → global, cached. `set(scope, scopeId, key, value)` clears cache.
- **`SequenceService::next($companyId, $docType)`** — **ATOMIC** (transaction + lockForUpdate). Returns formatted number e.g. `SO/2026/00001`. Format tokens: `{prefix}`, `{suffix}`, `{number}`, `{year}`, `{year_short}`, `{month}`, `{day}`. Reset periods: never / yearly / monthly.
- **Seeded sequences (per company):** quotation, sales_order, invoice, credit_note, purchase_order, grn, purchase_invoice, batch, shipping_bill, export_invoice, inter_company_invoice. The Inventory module appends `stock_adjustment` and `stock_transfer`.
- **Audit log** — `Spatie\Activitylog\Models\Activity` queried by `Modules\Settings\Http\Controllers\AuditLogController` at `GET /audit-logs`.

### 2.1 CRM Partners (`Modules\Crm`)

- **Tables:** `partners` (type enum: client/supplier/vendor/manufacturer/importer/employee/other), `partner_contacts`, `partner_addresses`, `partner_bank_accounts`.
- **Country mandatory** — `country char(2)` (ISO-2) defaults to `IN` and is required in the partner form (StorePartnerRequest + UpdatePartnerRequest validate `required`/`required_without_id`).
- **Tax treatment is country-gated** — `prepareForValidation()` on the request silently forces `tax_treatment='overseas'` when country ≠ IN; the frontend Partner form mirrors this with a reactive `useEffect` that locks the tax-treatment dropdown + disables GST/PAN inputs when country ≠ IN, and restores `tax_treatment='unregistered'` when country flips back to IN.
- **Key endpoint:** `GET /lookup/partners?q=&type=&limit=` — used by every Quotation / SO / PO / Invoice form. Lookup returns `country` and `tax_treatment` so document forms can adapt.
- **Default Bill To partner** seeded per company: code `BILLTO-ORDER`, name `Z TO ORDER AND NA` (auto-prefilled in the New Export Invoice form for the typical "to order" L/C scenario; user can swap to the actual buyer).
- **Sidebar** has 7 partner-type submenu items (Clients, Suppliers, Vendors, Manufacturers, Importers, Employees, All) using URL `?type=` filter.
- **Demo seeded** for both companies (Acme Pharma USA, Globex Chemicals, India Logistics, etc.).

### 2.2 Products (`Modules\Products`)

- **Tables:** `product_units` (with base_unit_id self-FK + conversion_factor), `product_categories` (parent_id self-FK + materialized `path`), `products` (50+ columns including HSN, tax rate, costs, prices, reorder levels, batch/expiry/serial flags), `product_uom_conversions`.
- **`ProductCategoryService`** — auto-syncs `depth` and `path` on create/update; rejects cycles (parent = self or descendant).
- **Key endpoint:** `GET /lookup/products?q=&type=&category_id=&limit=`.
- **Seeded units (per company):** kg, g, mg (weight), L, ml (volume), pcs, dozen, box, bag, drum (count), m, cm (length). Derived units link to base via `base_unit_id` after the second pass of the seeder.

### 3.1 Inventory + Stock Ledger (`Modules\Inventory`)

**This module is foundational — every future stock-touching module uses StockService.**

- **Tables:** `stock_ledger` (immutable append-only), `stock_adjustments` + `stock_adjustment_lines`, `stock_transfers` + `stock_transfer_lines`.
- **`StockService::record($params)`** — the **ONE** API every other module uses to move stock. Atomic via row-locking. Computes running `balance_qty`. Required keys: `company_id, warehouse_id, product_id, movement_type, qty, posted_at`. Optional: `rate, reference_type, reference_id, reference_no, batch_no, expiry_date, serial_no, notes`. **Caller passes positive qty for IN/TRANSFER_IN/OPENING and OUT/TRANSFER_OUT — service signs it.** For ADJUSTMENT, caller passes signed qty.
- **`StockService::reverse($ledgerId, $reason)`** — appends a negative-of-original row, marks original `is_reversed = true`. Used by adjustment/transfer/grn/invoice cancellations.
- **`StockService::getCurrentStock($productId, $warehouseId, $batchNo)`** — reads most recent ledger row's `balance_qty`.
- **`StockService::currentStockPivot($companyId, $warehouseId)`** — feeds the Current Stock UI page.
- **Workflows:**
  - Adjustment: `draft → submitted → approved (writes ledger) → cancelled (reverses)`
  - Transfer: `draft → sent (TRANSFER_OUT) → received (TRANSFER_IN) → cancelled (reverses both)`

### 3.2 Purchase (`Modules\Purchase`)

- **Tables:** `purchase_orders` + items, `grns` + items, `purchase_invoices` + items.
- **Workflows:**
  - PO: `draft → submitted → approved → partial → received → cancelled`. PO doesn't touch stock — GRN does.
  - GRN: `draft → received (StockService::record IN per line) → cancelled (reverse)`. GRN bumps `purchase_order_items.received_qty` and refreshes parent PO status.
  - PI: `draft → posted → partially_paid → paid → cancelled`. PI doesn't touch stock either; it's the AP document. (Supplier payments will live in Module 5.1 Finance.)
- **Sequence types used:** `purchase_order`, `grn`, `purchase_invoice` (already seeded by Settings module).

### 4.1 Quotation (`Modules\Quotation`)

- **Tables:** `quotations` + items.
- **Workflow:** `draft → submitted → approved → converted/expired/cancelled`.
- **Convert to SO:** `POST /quotations/{id}/convert` calls `Modules\Sales\Services\SalesOrderService::createFromQuotation($q, $actorId)`. Sets `quotations.converted_to_sales_order_id` and `status='converted'`.
- **No stock impact.** Pure document.

### 4.2 Sales (`Modules\Sales`)

- **Tables:** `sales_orders` + items, `invoices` + items, `invoice_payments`.
- **Workflows:**
  - SO: `draft → submitted → approved → in_production → partial → invoiced → cancelled`. SO doesn't touch stock either. Production batches (4.3) and Invoices do.
  - Invoice: `draft → posted (StockService::record OUT per line) → partially_paid → paid → cancelled (reverse)`. Posting bumps `sales_order_items.invoiced_qty` and refreshes parent SO status. Payments auto-flip status to `partially_paid` / `paid` based on running paid total vs total.
- **Payments** are stored in `invoice_payments` with mode (bank/cash/cheque/upi/card). Deleting a payment subtracts from `paid_amount` and re-evaluates status.

### 4.3 Production (`Modules\Production`)

- **Tables:** `production_batches` (header), `production_batch_inputs` (raw consumed lines), `production_batch_outputs` (finished/by-product/scrap produced lines), `production_quality_checks` (pass/fail QC log).
- **Workflow:** `draft → submitted → approved → in_progress → completed → cancelled`. `complete` is the **only** step that touches `stock_ledger`. `cancel` reverses every ledger row written by completion.
- **`ProductionBatchService::complete($batch, $actuals)`** — for each input line writes `StockService::record(OUT)` from `raw_warehouse_id` (with `source_batch_no` if set), persisting `ledger_id` on the line. For each output line with `qty_produced > 0` writes `StockService::record(IN)` into `finished_warehouse_id` stamped with `output_batch_no` + `expiry_date`. Material cost is allocated to non-scrap outputs in proportion to planned qty (last finished line absorbs rounding). The header rolls up `qty_produced` (finished + by-product) and `qty_failed` (scrap).
- **Sequence type used:** `batch` (prefix `BT`) — already seeded by Settings module per company; no Production-side sequence config needed.
- **Cost model:** material cost only for now. Labour / overhead come with Module 5.1 Finance.
- **No BOM auto-population** — input lines are entered manually until Module 2.3 Formula + Costing ships.
- **From-SO prefill:** the batch form accepts `?from_so=<id>` (used by the "+ New production batch" button on the SO page). Prefills `target_product_id`, `qty_planned` (= ordered − invoiced), `sales_order_id`.

### 4.4 Order Tracking (`Modules\Tracking`)

- **No tables.** Read-only aggregator over Quotation + SO + Production + Invoice + Payment + StockLedger.
- **Endpoints:**
  - `GET /api/v1/tracking` — paginated list of open SOs with computed `produced_pct / invoiced_pct / paid_pct`. Default filter is "open statuses" (draft, submitted, approved, in_production, partial); pass `?status=` to override.
  - `GET /api/v1/tracking/sales-orders/{order}` — full lineage: `{ sales_order, quotation, production: { batches, totals }, invoices, payments_total, stock_movements, progress, timeline[] }`. The timeline is chronologically sorted with kinds `quotation_created / quotation_approved / so_created / so_approved / batch_started / batch_completed / batch_cancelled / invoice_created / invoice_posted / payment_received`.
- **`OrderTrackingService::progressOf(SalesOrder $so)`** — computes `produced_qty` (sum of non-cancelled batch `qty_produced`), `invoiced_amount` (sum of non-cancelled invoice totals), `paid_amount` (sum of `paid_amount`). Percentages clamped to ≤100.
- **Permission:** `tracking.view` — granted to admin / manager / viewer.

**Cross-module wiring (added with 4.4):**

- `SalesOrder` model gained `productionBatches(): HasMany` and `quotation(): BelongsTo` relations (FKs already existed).
- `SalesOrderResource` (when eager-loaded) now exposes `quotation`, `production_batches[]`, `invoices[]` summary blocks.
- `SalesOrderController::show` eager-loads `'quotation', 'productionBatches', 'invoices'` so the SO form page can render Linked panels.
- Frontend cross-link tags: SO# / batch# / invoice# rows in any list are now clickable `<Link>`s. SO form has a "+ New production batch" button → `/production-batches/new?from_so=<id>` and a "Trace" button → `/tracking/sales-orders/<id>`. Production batch form has a "Trace SO" button when linked.

### 2.3 Formula + Costing (`Modules\Formula`)

- **Tables:** `formulas` (versioned, one **active** per target product per company), `formula_components`.
- **`FormulaService::scaleFor(Formula, $targetQty)`** — returns input lines scaled by `targetQty / output_qty * (1 + wastage_pct/100)`, rate from `Product->standard_cost`. Used by the Production batch UI's "Use formula" button via `GET /api/v1/formulas-scale?target_product_id=&qty=`.
- **Workflow:** `draft → active → inactive`. Activating one auto-deactivates all other versions of the same target product.
- **Permissions:** `formula.view/create/update/delete/activate`.

### 4.5 Export Management (`Modules\Export`)

- **Tables (4 docs):** `export_invoices` + items, `shipping_bills` + items, `packing_lists` + items, `tax_invoices` + items. See §5 for full column list. PL/TI snapshot **all** EI header fields so each is a self-contained legal document for customs/GST.
- **Workflows:**
  - **Export Invoice:** `draft → posted → partially_paid → paid → cancelled`. Posting does **NOT** touch stock (goods leave on Shipping Bill dispatch). Payment is applied by IRM via `applyPaymentInr / reversePaymentInr`. EI form ships the full Indian-export template: Bill To dropdown defaults to seeded `BILLTO-ORDER` partner; sections for compliance (LUT, transport mode, customs notification), consignee (Pick-from-CRM autofill or manual), Notify Party 2, ports + destinations + payment terms, charges (freight/packaging/development), live INR-equivalents totals.
  - **Auto-companion docs**: `ExportInvoiceService::create()` calls `PackingListService::createFromExportInvoice` + `TaxInvoiceService::createFromExportInvoice` in the same transaction (idempotent — re-runs return existing). Also exposes `POST /export-invoices/{id}/companion-docs` for manual re-generation. EI page shows a Companion documents card with both docs and a "Re-generate missing" button.
  - **Packing List:** `draft → finalized → cancelled`. No stock impact. Form mirrors the EI template (consignee/notify/transport snapshotted) plus packing-specific fields: per-line packages (shipper qty), shipper unit (BOX/CARTON), gross/net weight (kg), dimensions, marks; header total_pallet_qty + volume_cbm.
  - **Tax Invoice:** `draft → posted → cancelled`. Slim INR view of the EI — only **exchange rate**, **customs notification no.**, **customs notification date** are user input (highlighted in a yellow card). All amounts displayed in ₹ INR; the EI's invoice code is shown as the primary "INVOICE NO" while TI's own `code` is internal ref. Lines read-only with `rate × exchange_rate` rendered as Price/Unit (₹) and Amount (₹). Supplier GSTIN auto-pulled from active company; recipient GSTIN auto-pulled from the partner.
  - **Shipping Bill:** `draft → dispatched → cancelled`. **Dispatch** writes `StockService::OUT` per line and bumps `export_invoice_items.shipped_qty`. Cancel after dispatch reverses ledger rows. Cancelling an EI is blocked while it has live shipping bills.
- **Sequences used:** `export_invoice` (`EI`), `shipping_bill` (`SB`), `packing_list` (`PL`), `tax_invoice` (`TI`) — all seeded per company; missing ones backfilled via migrations.
- **From-SO prefill:** `?from_so=<id>` on the EI form prefills partner + lines; the SO form has a "+ New export invoice" button. Shipping bills, packing lists, tax invoices similarly accept `?from_ei=<id>` to auto-snapshot the EI.

### 4.6 IRM + Lodgement + Bank Closure (`Modules\Irm`)

**Two-step bank model:** IRMs land first (advance receipts), then get allocated to EIs over time via Lodgements (a record of what was sent to the bank with the bank's response).

- **Tables:** `irms`, `irm_allocations`, `lodgements`, `bank_realizations`. See §5 for full column list.
- **IRM creation** is now always an **advance** receipt: only `partner_id` is required; PO ref + proforma_invoice_no are optional references. EI link is gone from the form (legacy `against_invoice` mode preserved in service for back-compat). Status: `received → partially_allocated → allocated → closed → cancelled`.
- **`IrmService::allocate(Irm, [ei_id, amount_fcy, exchange_rate, is_third_party_payment])`** is the heart of the new flow. Decreases IRM `outstanding_amount_fcy/inr`, calls `ExportInvoiceService::applyPaymentInr`, transitions status. Partner-mismatch is allowed only when `is_third_party_payment=true` (flag auto-set by Lodgement when IRM partner ≠ lodgement client). `deallocate(IrmAllocation)` undoes one allocation (reverses the EI's paid_amount, restores IRM outstanding).
- **`LodgementService`** (`Modules\Irm\Services\LodgementService`) wraps a batch of allocations under one bank receipt:
  - `create(partner, header, rows[])` → draft Lodgement + N allocations, all in a single transaction. Auto-flags `is_third_party_payment` when row's IRM belongs to a different partner.
  - `submit()` → status `submitted` (we sent to bank).
  - `accept(receipt_no, receipt_date)` → status `accepted`, pending rows stamp utilised, bank receipt recorded.
  - `reject(reason)` → status `rejected`; **reverses every row not individually marked utilised** (partial-acceptance scenario).
  - `cancel()` → reverses ALL rows, status `cancelled`.
  - `markRow(allocation, status)` → individual row utilised / unutilised / rejected. Marking unutilised/rejected calls `deallocate` — IRM outstanding + EI balance restored.
- **Frontend:** `/irms` (list), `/irms/new` (advance-receipt form), `/irms/{id}` (KPI strip + allocations panel + ad-hoc Allocate modal). `/export-lodgement` (history list), `/export-lodgement/new` (builder: pick client → toggle "Show third-party IRMs" if needed → map IRM amounts to EIs → save), `/export-lodgement/{id}` (header editable + allocation rows with per-row Utilised/Unutilise/Reject buttons + Accept/Reject lodgement modals).
- **Sequences used:** `irm`, `lodgement` (`LODGE`) — backfilled per company via migration.
- **Permissions:** `irm.view/create/update/delete/close`, `lodgement.view/create/update/delete/submit`.

### 5.4 Inter-Company Billing (`Modules\InterCompany`)

- **Tables:** `inter_company_invoices` (spans two companies — explicit `from_company_id` + `to_company_id`, does **NOT** use `BelongsToCompany`), `inter_company_invoice_items` (`cost_rate`, `sell_rate`, paired `from_ledger_id` + `to_ledger_id`).
- **`InterCompanyInvoiceService::post`** — single transaction: writes one `StockService::record(OUT)` from `from_warehouse` (under `from_company_id` context) + one `StockService::record(IN)` into `to_warehouse` (under `to_company_id`); creates a regular `Invoice` on the seller's books and a regular `PurchaseInvoice` on the buyer's books; persists `linked_sale_invoice_id` + `linked_purchase_invoice_id`. Cancel reverses all four (2 ledger reversals + 2 invoice cancels).
- **Settings prerequisite:** each company needs `intercompany.partner_for_company_<other_id>` (company-scope setting) pointing to the partner record in its CRM that represents the counterpart company. Service throws clear error naming the missing key on `post` if unset.
- **Sequences used:** `inter_company_invoice` (`ICI`) for the ICI itself; `invoice` (`INV`) and `purchase_invoice` (`PI`) for the mirror docs (each in their own company context).
- **Permissions:** `intercompany.view/create/update/delete/post/cancel`.

**Cross-module wiring (added with this batch):**

- `SalesOrder` model gained `exportInvoices(): HasMany`. `SalesOrderResource` exposes `export_invoices[]` summary; `SalesOrderController::show` eager-loads it. SO form page has a "+ New export invoice" button + "Linked export invoices" panel.
- `OrderTrackingService::traceSalesOrder` loads `exportInvoices.shippingBills` and the IRMs of those EIs. Returns `export_invoices`, `shipping_bills`, `irms` blocks. Timeline gains `export_invoice_created`, `export_invoice_posted`, `shipping_bill_dispatched`, `shipping_bill_cancelled`, `irm_received`, `irm_closed` events. Stock-movement query also picks up `ShippingBill` references.
- Production batch form has a "Use formula (auto-fill inputs)" button that calls `formulasApi.scale` and replaces the `inputs` array.

### 5.1 Finance + Ledger (`Modules\Finance`)

- **Tables:** `accounts`, `account_balances`, `journal_entries`, `journal_lines`, `fiscal_periods`.
- **`JournalService`** — full CRUD + `post` + `cancel`. `validateBalanced` enforces sum(debits)=sum(credits) and rejects posts to group accounts. **`postFromReference($refType, $refId, ...)`** is idempotent (dedupes via `journal_entries.reference_type` + `reference_id`).
- **`BalanceService`** — `recompute / trialBalance / ledger / profitAndLoss / balanceSheet / balanceAt`. Sign-natural balances (asset/expense = +; liability/equity/income = −).
- **`AutoJournalListener`** subscribes to events from existing modules:
  - `Modules\Sales\Events\InvoicePosted` → Dr AR, Cr Revenue (+ Cr Tax-output)
  - `Modules\Sales\Events\InvoicePaymentReceived` → Dr Bank/Cash, Cr AR
  - `Modules\Purchase\Events\PurchaseInvoicePosted` → Dr Purchase + Tax-input, Cr AP
  - `Modules\Irm\Events\IrmReceived` → Dr Bank, Cr Export-AR
  - `Modules\Irm\Events\BankRealizationRecorded` → Dr Net + Commission + TDS, Cr Bank
  - `Modules\Production\Events\ProductionBatchCompleted` → Dr FG-Inventory, Cr Raw-Inventory (single inventory account today)
  - `Modules\InterCompany\Events\InterCompanyInvoicePosted` → Dr AR, Cr Revenue
  - `Modules\Hr\Events\SalaryRunPosted` → Dr Salary expense, Cr Salary payable
  - `Modules\Loans\Events\LoanPaymentReceived` → Dr/Cr Bank ↔ AR/AP per loan type
  - **Idempotency:** if a posted JE already exists for `(reference_type, reference_id)` the listener returns the existing JE — safe to re-fire.
  - **Missing-setting handling:** if a default account id is not configured for the active company the listener logs a warning and skips. Source operation is NOT blocked.
- **Settings (seeded per company by FinanceSeeder, all editable):** `finance.default_ar_account_id`, `…ap_account_id`, `…revenue_account_id`, `…purchase_expense_account_id`, `…tax_input_account_id`, `…tax_output_account_id`, `…bank_account_id`, `…cash_account_id`, `…export_ar_account_id`, `…inventory_account_id`, `…cogs_account_id`, `…salary_expense_account_id`, `…salary_payable_account_id`.
- **Seeded CoA per company** — Indian-business standard (Bank, Cash, AR, AR-Export, Inventory-Raw/Finished, AP, Tax-payable, Salary-payable, Capital, Retained Earnings, Sales-Domestic/Export, Other Income, COGS, Purchase Expenses, Salary Expense, Bank Charges, TDS Expense, Tax-Input, Office Expenses).
- **Sequence:** `journal_entry` (`JE`) seeded by `FinanceSeeder` per company.
- **Permissions:** `finance.account.*`, `finance.journal.*`, `finance.period.*`, `finance.report.view`.

### 5.2 Loans + EMI (`Modules\Loans`)

- **Tables:** `loans`, `loan_emi_schedule`, `loan_payments`.
- **`LoanService`** — `create` generates reducing-balance EMI schedule atomically. `recordPayment` waterfalls amount across overdue + pending EMIs in due_date order, updates `outstanding_principal`, auto-closes loan when fully repaid. Fires `LoanPaymentReceived` event for Finance auto-journal.
- **Permissions:** `loan.view/create/update/delete/payment/close`.
- **Sequence:** `loan` (`LOAN`) seeded by `LoansSeeder`.

### 5.3 HR + Salary (`Modules\Hr`)

- **Tables:** `designations`, `employees` (optional `user_id` link), `salary_components`, `employee_salary_structures` (latest per employee applies; JSON snapshot of components), `salary_runs`, `payslips`.
- **`PayrollService::prepareRun(period)`** — for each active employee with a structure, builds a payslip (basic + per-component computation: fixed amount or `% of basic`).
- **`post(SalaryRun)`** locks the run + fires `SalaryRunPosted` event (Finance auto-journals: Dr Salary Expense, Cr Salary Payable).
- **Seeder** adds standard components per company: Basic (implied by employee structure), HRA (40% of basic), DA (10%), PF (12% deduction), ESI (0.75% deduction), PT (₹200 fixed deduction).
- **Sequences:** `employee` (`EMP`), `salary_run` (`PAY`) seeded by HrSeeder.
- **Permissions:** `hr.employee.*`, `hr.designation.*`, `hr.salary.structure.view/edit`, `hr.payroll.view/run/post/cancel/markpaid`.

### 6.1 Documents (`Modules\Documents`)

- **Tables:** `documents` — polymorphic on `(attachable_type, attachable_id)`. File stored on Laravel `Storage::disk(env('SHARED_STORAGE_DRIVER', 'local'))`.
- **Endpoints:** `POST /api/v1/documents` (multipart), `GET /api/v1/documents` (filterable), `GET /api/v1/documents/{document}/download`, `DELETE /api/v1/documents/{document}`.
- **Frontend:** `<DocumentsPanel attachableType={...} attachableId={...} />` is a drop-in component for any form page (re-exported from `19-documents/index.ts`).
- **Permissions:** `document.view/upload/delete`.

### 6.2 Tasks + Reminders + Google Calendar (`Modules\Tasks`)

- **Tables:** `tasks` (polymorphic `related_type+id`, optional `assignee_id`, `google_event_id` placeholder), `reminders` (notify_at, channel email/in_app, status), `oauth_tokens` (per-user encrypted Google tokens).
- **`TaskService`** — CRUD + `complete / reopen`. `ReminderService::dispatchDue()` runs as `php artisan reminders:dispatch` (also wireable into a 5-min scheduler in `routes/console.php`). Email reminders go through `Modules\Comms\Services\CommService::sendEmail`.
- **Google Calendar sync — STUBBED.** `GoogleCalendarService` throws `RuntimeException("Set GOOGLE_CLIENT_ID/SECRET first.")` until env vars are populated. Routes (`/tasks/calendar/auth-url`, `/callback`) and the "Sync to Google" button exist; UI shows a friendly message when unconfigured.
- **Permissions:** `task.view/create/update/delete/assign`.

### 6.3 Communication (`Modules\Comms`)

- **Tables:** `comm_messages` (polymorphic `related_type+id`), `comm_templates` (with `{{placeholders}}` and `applyTemplate(code, vars)`).
- **`CommService::sendEmail`** uses Laravel `Mail::raw` (real SMTP if `MAIL_*` env vars are set; falls back to log driver).
- **`CommService::sendWhatsApp`** dispatches to a `WhatsAppProvider` interface implementation (default: `PlaceholderWhatsAppProvider` that logs to DB with a fake message id). Swap by setting `WHATSAPP_PROVIDER` env var and binding a different concrete in `CommsServiceProvider`.
- **Frontend:** `MessagesListPage` (filter by channel/status, send-email + send-whatsapp modals), `TemplatesPage` (CRUD).
- **Permissions:** `comm.view`, `comm.send.email`, `comm.send.whatsapp`, `comm.template.manage`.

### 6.4 Reports (`Modules\Reports`)

- **No tables.** Single controller, 9 endpoints under `/api/v1/reports/*`:
  - `sales-register`, `purchase-register`, `stock-summary`, `production-summary`,
  - `payments-receivable`, `payments-payable`,
  - `profit-and-loss` (consumes `journal_lines`), `balance-sheet` (consumes `account_balances` via BalanceService),
  - `export-realization` (Export Invoice + IRM combined view).
- **Frontend:** `ReportsHomePage` lists available reports; `ReportViewerPage` is a generic viewer that reads `REPORT_DEFS[code]` to know the date-mode (`fromTo` / `asOf` / `none`), runs the report, renders rows + totals + supports CSV export client-side.
- **Permission:** single `report.view`.

### 6.5 Dashboard (`Modules\Dashboard`)

- **No tables.** Single endpoint `GET /api/v1/dashboard/kpis?from=&to=` returns a privacy-first KPI payload: `sales / purchase / production / inventory / export / finance / tasks / trends / activity`.
- **Privacy-first redesign (2026-05):** No buyer / supplier / partner names anywhere on the response. Removed `top_5_clients` / `top_5_suppliers` / `recent_journals`. Replaced with: `trends.months[]` (12 months of sales/purchase/produced totals), `finance.ar_aging` + `finance.ap_aging` (4 buckets each), `inventory.by_warehouse[]` (warehouse codes only), `activity.*` (anonymous transaction counters today/week).
- **Frontend:** `DashboardPage` rebuilt with gradient hero cards (4 financial KPIs with sparkline + ↑↓ trend), 4 secondary stat cards with colored left-stripe accent, sales/purchase/production sparklines (last 12 months), AR + AP aging bar charts, stock-by-warehouse bars, and a "system pulse" chips panel. **All charts are inline SVG via `Sparkline.tsx` + `MiniBars.tsx` — no chart library installed**.
- **Mandatory daily checklist (`TodayTasksPanel`)** — pinned at the top of the dashboard, ABOVE the financial KPIs. Drives daily completion accountability:
  - Lists OVERDUE (red) + DUE TODAY (orange) tasks for the current user, plus a count of DONE TODAY (green) with a progress ring (`done / total %`).
  - Quick-add input — type a title + Enter creates a task with `due_date = today, assignee = current user, priority = med` (overridable). Inline checkbox marks done; un-tick reopens.
  - Scope toggle: "My tasks only" (default) vs "All team tasks" (peek across the team without leaving the dashboard).
  - Sources data via the regular Tasks API; relies on `TaskService::paginate` filters `due_date_from`, `due_date_to`, `status_in`, `has_due_date` (added 2026-05).
- **Permission:** `dashboard.view`.

### 6.6 Export Incentives (`Modules\ExportIncentives`)

- **Tables:** `export_incentive_claims` (Drawback / IGST refund / RoDTEP — single polymorphic table by `type` enum). Workflow: `pending → filed → approved → credited / rejected` (rejected from any non-terminal state). `transition()` enforces legal status moves.
- **Endpoints:** `GET|POST|PUT|DELETE /api/v1/export-incentive-claims`, `POST /api/v1/export-incentive-claims/{claim}/transition` (body: `to_status` + payload like `credited_amount`, `bank_ref`, or `rejection_reason`).
- **Frontend:** `frontend/src/modules/24-export-incentives/` — list page (filter by type/status/date) + form page with status-transition buttons + record-credit modal.
- **Sidebar:** under Export & Bank group: "Drawback / IGST / RoDTEP".
- **Permissions:** `export.incentive.view/create/update/delete`.

### 6.7 Document Templates + PDF (`Modules\Templates`)

- **Composer:** `barryvdh/laravel-dompdf:^2.0` (pure PHP, no binary install).
- **Tables:** `document_templates` — one editable template per (company × `doc_type`). Seeded with 6 defaults per company by `TemplatesDatabaseSeeder` (Invoice / Quotation / Sales Order / PO / Export Invoice / Tax Invoice).
- **Renderer:** `TemplateRenderer` — safe Mustache flavour (NO Blade, NO PHP execution). Supports `{{var}}` (HTML-escaped), `{{{var}}}` (raw), `{{#section}}…{{/section}}` loops, `{{^section}}` inverse, filters: `money:N`, `date:FMT`, `upper`, `lower`, `nl2br`, `default:VAL`, `int`. `TemplateContextBuilder` produces a uniform `{ company, partner, doc, items, consignee?, notify_party? }` context per doc model.
- **Family-sequence:** `PackingListService::createFromExportInvoice` and `TaxInvoiceService::createFromExportInvoice` extract the EI's running number via `SequenceService::extractFamilyNumber()` and pass it to `formatWithNumber()` so PL/TI codes share the family number with their own prefix.
- **PDF endpoints:** `GET /api/v1/{invoices|quotations|sales-orders|purchase-orders|export-invoices|tax-invoices}/{id}/pdf` — wrapped by `PdfService::download()` (dompdf with DejaVu Sans, isRemoteEnabled for logos).
- **Frontend Settings page:** `/document-templates` — list per company × doc_type with Make Default + Edit + Delete actions. **Edit modal is split-pane**: HTML/CSS textareas on the left, sandboxed iframe live preview on the right (rendered against mock data).
- **Frontend "Download PDF" button:** `<DownloadPdfButton url filename>` shared component — fetches as Blob (preserves auth + `X-Company-Id` headers), saves via `URL.createObjectURL`. Added to header of all 6 doc forms (visible only when `editing`).
- **Permissions:** `template.view/create/update/delete`, `document.pdf.download`.

## 8. Cross-cutting conventions

### Backend

- **Every business model:** `BelongsToCompany` + `LogsActivity` + `SoftDeletes` traits.
- **Every business table:** `id`, `company_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`. Status enum where relevant. Composite index `(company_id, status, deleted_at)` or `(company_id, deleted_at)`.
- **FK rules:** `ON DELETE RESTRICT` on master data refs (partners, products, companies). `ON DELETE CASCADE` only on `*_items` tables (lines).
- **Money:** `decimal(18, 2)` for amounts, `decimal(18, 4)` for qty/rate, `decimal(18, 6)` for exchange_rate.
- **Decimal cast:** declare `'col' => 'decimal:N'` in model `$casts`. **Don't trust JS floats for money math** — backend always recomputes line subtotal/tax/total in services.
- **Polymorphic refs:** `reference_type` (string) + `reference_id` (bigint). Used in `stock_ledger` and `documents` (future).
- **Auto-numbering:** Always go through `SequenceService::next()` inside the create transaction. Do **not** hand-roll codes.
- **Stock movement:** Always go through `StockService::record()`. Never write to `stock_ledger` directly.

### Backend gotchas (PHP 8.0 + Laravel 9 specific)

| Gotcha | Fix |
|---|---|
| `private readonly Foo $foo` in constructor | PHP 8.1+. Use plain `private Foo $foo`. |
| `'password' => 'hashed'` cast | Laravel 10+. Hash manually with `Hash::make()` in services/seeders. |
| `toArray(Request $request): array` typed param | Parent on Laravel 9 is untyped. Use `toArray($request): array` plus `/** @var \Illuminate\Http\Request $request */` for IDE. |
| Controllers extending `Illuminate\Routing\Controller` lack `authorizeResource` | Extend `App\Http\Controllers\Controller` (which uses `AuthorizesRequests`). |
| Sanctum's vendor migration conflicts with our `personal_access_tokens` migration | `Sanctum::ignoreMigrations()` in `Modules\Auth\Providers\AuthServiceProvider::register()`. |
| `password_resets` (Laravel 9) vs `password_reset_tokens` (Laravel 11) | We use the latter; `config/auth.php` `passwords.users.table` is set to `password_reset_tokens`. |

### Frontend

- **Module folder convention:** `frontend/src/modules/NN-name/` with `api/`, `components/`, `pages/`, `types/`, optional `store/`. **Always export through `index.ts`** so `App.tsx` only imports from `'./modules/NN-name'` (not deep paths).
- **Routing:** Each module exports `xxxPrivateRoutes: RouteObject[]` (and `xxxPublicRoutes` for auth). Pages are lazy-loaded with `React.lazy`.
- **Auth wrapper:** `<RequireAuth permission="...">` from `01-auth`. Wrap every private page.
- **Axios:** Single client at `01-auth/api/axiosInstance.ts` with auto-refresh on 401, `X-Company-Id` header, base URL from `VITE_API_BASE_URL`. Every API file imports `apiClient` from there.
- **Forms:** Ant Design `<Form>` with `Form.useForm`. Validate with `rules: [{ required: true }]` etc.
- **Document forms:** Use `<DocumentLineEditor>` from `modules/common/`. It handles product autosuggest (via `productApi.lookup`), per-line subtotal/tax/total auto-recalc, optional batch/expiry columns, and a totals summary row.
- **TS imports:** When importing types from packages that export them as type-only (`axios`'s `AxiosError` etc.), use `import type { ... } from 'pkg'` to avoid Vite ESM runtime errors.
- **No emojis in UI** unless the user explicitly asks. (Same applies to code/file content.)

### Frontend shared building blocks (`modules/common/`)

These are the universal pieces every form/list page composes. Reach for them before writing one-off Selects or confirmations.

- **`DocumentLineEditor`** — line table for Quotation/SO/Invoice/PO/PI/GRN/EI. Handles HSN/qty/rate/tax recalc, optional batch + shipper columns, totals summary.
- **`SmartDropdown<T>`** — generic typeahead with lazy-load (default 10/page), pinned "+ Add new" footer, fallback label for edit-mode rendering, `refreshKey` for parent-triggered re-fetch. Direct use rare — prefer the typed wrappers below.
- **`PartnerSmartDropdown`** / **`CategorySmartDropdown`** / **`UnitSmartDropdown`** — typed wrappers around `SmartDropdown` with built-in inline-create modals. Use these in every form that picks a partner / category / unit. Critical: AntD `Form.Item` overrides children's `onChange`, so these wrappers split the API into `onChange(id)` (form value, captured by Form.Item) and `onPartnerSelect(partner)` / `onCategorySelect` / `onUnitSelect` (side effect, fires reliably for label/auto-fill state).
- **`InlineCreatePartnerModal`** / **Product** / **Category** / **Unit** — minimal "quick add" modals invoked from SmartDropdown's pinned footer. Each accepts `defaultType` + `lockType` to pre-select the entity type. Backend `Store*Request` for these four entities auto-generates `code` from name when blank, so the inline form skips the Code field entirely.
- **`DocumentNumberField docType="invoice" editing={editing}`** — editable preview of the next sequence code on every doc create form. Calls `GET /api/v1/sequences/preview?doc_type=…&company_id=…` on mount, prefills with the next code, lets user override. Has a "↻" reload button to re-fetch (in case Sequence Management was edited in another tab). On save, the user's value is sent in the `code` field; backend `SequenceService::next($cid, $docType, $userCode)` returns the user's code verbatim and advances the master counter past its embedded number. **Wired into:** Quotation, SO, Invoice, PO, GRN, PI, EI, TI (PL via auto-spawn), Inter-Company Invoice, Loan, Journal Entry, Production Batch, Packing List. (Lodgement uses its own builder; Salary Run uses `prepareRun()` not a typical create header — both intentionally skipped.)
- **`cachedList(prefix, params, fetcher)`** — list-page response cache (5s TTL) layered on top of `cachedFetch`. Stable-stringifies `params` to a deterministic key. Every paginated list endpoint uses it. **Mutations call `invalidate(prefix)`** to flush — and cross-prefix flushes when ops cascade (creating an EI flushes `list:packing-lists` + `list:tax-invoices`; ICI mutations flush invoices + purchase-invoices; IRM/lodgement flush export-invoices). Company switch fires `crm-erp:company-switched` → all list caches drop. Net: pagination + sort + filter changes inside 5s are instant; reopening a list page from a detail view skips the round-trip.
- **`DownloadPdfButton url filename`** — fetches a backend `/pdf` endpoint as Blob (preserves Sanctum auth + `X-Company-Id` headers), saves via `URL.createObjectURL`. Already wired into Invoice / Quotation / SO / PO / EI / TI form headers (visible only when `editing`), plus the Reports viewer (URL rebuilt from current date filters).
- **`TableSkeleton rows columns withHeader onRetry slowThresholdMs`** — shimmer placeholder for list pages on first paint. Render in place of `<Table>` when `loading && data.length === 0`. After `slowThresholdMs` (default 4 s) without data, auto-swaps for a "Server is taking longer than usual" panel with optional Retry button — avoids the forever-shimmer when `php artisan serve` is queued.
- **`confirmDelete({ title, content, onOk, danger? })`** — single utility for all destructive confirmations. Wraps AntD `Modal.confirm` with centered + blocking + red Yes/Delete defaults. **Replaces every `<Popconfirm>` across the app (39+ sites)** — never use `Popconfirm` for a delete action again. For non-destructive confirmations (Approve / Post / Submit), pass `danger: false` and a custom `okText: 'Yes, approve'` etc.
- **`ModuleGateway sections={[{title, tiles:[…]}]}`** (`modules/common/ModuleGateway.tsx`) — Tally-style landing page used by every top-level module (Sales / Purchase / Finance / etc.). Each `GatewayTile` has `{title, description, icon, route|onClick, color, shortcutId?, badge?, disabled?}`. If `shortcutId` is set, the tile renders a small grey badge with the combo (read from `app/shortcuts.ts`). Add new gateways in `modules/common/gateways/*Gateway.tsx`; wire them in `gateways/routes.tsx`.
- **`StatementHub`** (`modules/common/gateways/StatementHub.tsx`) — centralized statement entry point at `/reports/statement`. 13 categories — partner-type tiles open a PartnerSmartDropdown modal; account/loan tiles navigate to existing pages. The single source of truth for "open any ledger" — every per-module "view statement" link points here.
- **`QuickVoucherFab` + `QuickVoucherDrawer`** (`modules/16-finance/components/`) — floating "+" button bottom-right + 460px right-side drawer with 5 tabs (Buyer Receipt / Supplier Payment / Bank Receipt / Expense / Contra). Listens for `crm-erp:open-voucher` event to open directly to a tab (used by `GlobalKeyboard`'s `Ctrl+Shift+letter` shortcuts and by gateway tiles). FAB auto-shifts left when `VoucherSwitcher` rail is visible.
- **`VoucherSwitcher`** (`app/VoucherSwitcher.tsx`) — Tally-style right-edge rail that appears on voucher pages (detected by `useVoucherPath()`). Lists every voucher type grouped Sales/Purchase/Export/Other. Click any → instant navigation. Collapsible (168px ↔ 44px) with localStorage memory. Broadcasts width via `crm-erp:voucher-switcher-width` so `Layout.Content` and `QuickVoucherFab` adapt.
- **`CompanySelectionPanel`** (`modules/23-dashboard/components/`) — Tally Gateway-style master company picker. Avatar with company initials (color-coded by type), FY badge, GST/PAN/address meta, explicit "Change ▼" dropdown when >1 company (else "+ Add another company"). Used at the top of Dashboard. Dispatches `setActiveCompanyThunk` + fires `crm-erp:company-switched` event to flush all caches.
- **`shortcuts.ts` registry** (`app/shortcuts.ts`) — single source of truth for every keyboard combo. Three groups: `MODULE_SHORTCUTS` (Alt+letter — navigate to gateways), `VOUCHER_SHORTCUTS` (Ctrl+Shift+letter — opens drawer to a specific tab), `UNIVERSAL_SHORTCUTS` (Ctrl+S, Esc, ?, Alt+N). `matchCombo(combo, event)` is the parser. Edit a combo here → sidebar badges + gateway tile badges + cheat sheet + actual keyboard handler all update. `ShortcutsCheatSheet.tsx` renders the modal on `?`.
- **`lookupStore.ts`** (`app/lookupStore.ts`) — in-memory cache for `partners` / `products` / `accounts` / `units` / `categories`. `getAll(kind)` fetches + caches; `filter(kind, q, opts)` returns matches synchronously (zero network). `invalidateStore(kind)` is called by the existing `flush*Caches` helpers on every mutation. `useLookupPrefetch` (in AppShell) lazy-prefetches the small kinds (accounts/units/categories) after 1.5s of idle; partners/products lazy-load on first dropdown open. SmartDropdown wrappers (Partner/Category/Unit) call `isReady(kind)` first and bypass the API when cached.
- **`fy.ts`** (`app/fy.ts`) — Indian FY helpers. `fyStart()` / `fyEnd()` (Apr 1 → Mar 31), `formatFY()` ("FY 2025-26"), `listFinancialYears(count)` (Current + N prior FYs for statement-year dropdowns), `currentFYDates()`, `SPLIT_DATE_PRESETS` (Today / This week / This month / Current FY / Previous FY / Last 30 days / etc.) for `<DatePicker>` quick-range dropdowns. Imported by every financial page that has date pickers.

### Frontend dashboard inline-SVG charts (`modules/23-dashboard/components/`)

- **`Sparkline values color fillColor width height`** — area + polyline. Auto-scales to series max. Used inside hero KPI cards and the trends panel.
- **`MiniBars bars color format`** — horizontal bar chart, pure CSS. Each bar is `value / max * 100%` wide. Used for AR/AP aging and stock-by-warehouse.
- **`TodayTasksPanel`** — mandatory daily checklist at the top of the dashboard. Reads `useAppSelector((s) => s.auth.user)` for the current user, calls `tasksApi.list({ due_date_to: today, status_in: 'open,in_progress', assignee_id: me.id })` for the actionable list and a second call with `status: 'done'` for the done counter. Quick-add posts `{ title, due_date: today, assignee_id: me.id, priority }`. Check/uncheck calls `tasksApi.complete(id)` / `reopen(id)` and re-fetches.
- **No chart library installed.** Bundle stays small. If you ever need richer charts (multi-series, axis labels), `@ant-design/plots` or `recharts` would be the natural pick — but cost ~600 KB.

### Frontend gotchas

| Gotcha | Fix |
|---|---|
| `import axios, { AxiosError, AxiosRequestConfig } from 'axios'` fails in Vite | These are types. Use `import type { AxiosError, AxiosRequestConfig } from 'axios'`. |
| `[antd: message] Static function can not consume context` warning | Cosmetic in dev; would resolve by switching to `App.useApp().message` everywhere. Not blocking. |
| Antd v5/v6 deprecation warnings (`Alert message → title`, `Space direction → orientation`) | Suppressable; non-fatal. Will fix in a sweep when we upgrade antd. |
| `Request timed out. The server took too long to respond.` toast on Dashboard / fan-out pages | `php artisan serve` is single-threaded on Windows (see §9 caveat). Axios timeout already raised to 60s — if you still see this, switch to XAMPP Apache. Don't lower the timeout to "fix" it, you'll just hide the queueing. |

## 9. How to run locally

**RECOMMENDED — FAST mode (Apache + OPcache):** one-time setup with `scripts\setup-fast-backend.bat`, then daily startup via `scripts\start-all-fast.bat`. Apache (multi-threaded) replaces `php artisan serve` (single-threaded) for true parallel request handling — the Dashboard goes from 5-20s cold load → ~300-600ms. OPcache caches Laravel's compiled bytecode in shared memory. Persistent MySQL connections + gzip responses pile on more savings.

**Legacy — `php artisan serve` mode:** double-click `E:\CRM+ERP\scripts\start-all.bat`. Single-threaded; fine for quick smoke tests but watch for "Request timed out" toasts on fan-out pages.

Both scripts open separate console windows and are **idempotent** — re-running skips anything already listening on its port. To stop a service, close its window.

**Manual — three terminals at the project root:**

```powershell
# Terminal 1 — MySQL (only if not running yet)
C:\xampp\mysql_start.bat

# Terminal 2 — backend
cd E:\CRM+ERP\backend
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 3 — frontend
cd E:\CRM+ERP\frontend
npm run dev

# Optional — queue worker (only needed once 6.x reminders fire)
cd E:\CRM+ERP\backend
php artisan queue:work
```

Other helpers in `E:\CRM+ERP\scripts\`: `start-backend.bat`, `start-frontend.bat`, `migrate-fresh-seed.bat`, `queue-worker.bat`, `scheduler.bat`, `backup-db.bat`.

URLs:
- Frontend (open this): http://localhost:5173
- Backend API: http://127.0.0.1:8000/api/v1
- phpMyAdmin: http://localhost/phpmyadmin (XAMPP Apache must be started separately)

**Why localhost dies and how this fixes it:** MySQL, Laravel `php artisan serve`, and Vite `npm run dev` are all foreground processes — they only live as long as their terminal window stays open. Closing a window or signing out of Windows kills that service. `start-all.bat` brings them all back in one click.

**Windows artisan-serve performance caveat:** `php artisan serve` uses PHP's built-in HTTP server, which is **single-threaded on Windows** (`PHP_CLI_SERVER_WORKERS` only works on Linux/macOS — Windows PHP logs `forking is not supported on this platform` and falls back to single-thread). Pages that fan out to 5+ parallel API calls (Dashboard, IRM detail, EI form) can queue requests behind each other and individual requests can take 20-30s under cold-cache load. Mitigation already in place: axios timeout is set to **60s** in `axiosInstance.ts`. **Proper fix when this becomes annoying:** point XAMPP Apache at `backend/public/` (true multi-threaded serving) instead of using artisan serve. The Apache vhost setup is ~5 min and eliminates the queueing entirely.

Login (default super-admin, seeded):
- email: `admin@crm-erp.local`
- password: `ChangeMe@123`
- forced password change on first login.

## 10. How to add a new module — step by step

This codebase is module-by-module. To add Module N:

1. **Plan the tables.** Sketch FKs, indexes, FK rules. Decide which existing services it consumes (StockService? SequenceService? PartnerService?).

2. **Folder structure.** Create `backend/Modules/<Name>/` with the standard subfolders (Config, Database/Migrations, Database/Seeders, Models, Http/Controllers, Http/Requests, Http/Resources, Services, Policies, Providers, Routes).

3. **Migrations.** Use the date prefix `2026_<phase>_<sub>_<ord>_*` consistent with existing modules. Always add company_id FK with `ON DELETE RESTRICT`. Add composite indexes.

4. **Models.** Use `BelongsToCompany`, `LogsActivity`, `SoftDeletes`. Define `$fillable`, `$casts`, relationships, `getActivitylogOptions()`.

5. **Services.** Wrap state changes in `DB::transaction`. Use `SequenceService::next()` for codes. Use `StockService::record()` for any stock movement. Throw `RuntimeException` for business rule violations (caught by Laravel handler → 500 with the message).

6. **FormRequests.** Validation only. Authorization via `$this->user()?->can('module.action')`.

7. **Resources.** `toArray($request): array`. Cast decimals to `(float)` for JSON. Use `whenLoaded`/`whenCounted` for relations.

8. **Policies.** Map permissions to actions. Register in the module's ServiceProvider's `$policies` property.

9. **Controllers.** Extend `App\Http\Controllers\Controller`. Inject services. Use `$this->authorizeResource()` in `__construct` for CRUD. Use `$this->authorize()` for custom actions.

10. **Routes.** `Route::prefix('v1')->middleware(['auth:sanctum', 'company.context'])`.

11. **ServiceProvider.** Register policies, load migrations, register routes, singleton heavy services.

12. **Register provider in `backend/config/app.php`** under `providers`.

13. **Permissions.** Add to `Modules\Auth\Database\Seeders\RolePermissionSeeder::PERMISSIONS` AND to each role's list (admin, manager, viewer).

14. **Seeder.** Optional. If you have static defaults (like Settings module's default settings) seed them idempotently with `firstOrCreate`. Always make seeders **idempotent** — they may be re-run.

15. **Wire up:**
    ```powershell
    cd E:\CRM+ERP\backend
    composer dump-autoload -o
    php artisan migrate:fresh --force      # destructive; only in dev
    # then run all seeders in order
    ```

16. **Frontend module folder** at `frontend/src/modules/NN-name/` with `api/`, `components/`, `pages/`, `types/`, `routes.tsx`, `index.ts`.

17. **Update `App.tsx`:** import the new `xxxPrivateRoutes` and the new sidebar group items.

18. **Add to this CLAUDE.md** — bump the module list in section 7 and any new conventions in section 8.

## 11. Useful commands cheat sheet

```powershell
# Reset DB and reseed everything (DESTRUCTIVE)
cd E:\CRM+ERP\backend
php artisan migrate:fresh --force
php artisan db:seed --class='Modules\Auth\Database\Seeders\AuthDatabaseSeeder' --force
php artisan db:seed --class='Modules\Companies\Database\Seeders\CompaniesDatabaseSeeder' --force
php artisan db:seed --class='Modules\Settings\Database\Seeders\SettingsDatabaseSeeder' --force
php artisan db:seed --class='Modules\Crm\Database\Seeders\CrmDatabaseSeeder' --force
php artisan db:seed --class='Modules\Products\Database\Seeders\ProductsDatabaseSeeder' --force
php artisan db:seed --class='Modules\Inventory\Database\Seeders\InventoryDatabaseSeeder' --force
php artisan db:seed --class='Modules\Finance\Database\Seeders\FinanceDatabaseSeeder' --force
php artisan db:seed --class='Modules\Hr\Database\Seeders\HrDatabaseSeeder' --force
php artisan db:seed --class='Modules\Loans\Database\Seeders\LoansDatabaseSeeder' --force
php artisan db:seed --class='Modules\Templates\Database\Seeders\TemplatesDatabaseSeeder' --force
# (4.3 Production / 6.1 Documents / 6.2 Tasks / 6.3 Comms / 6.6 ExportIncentives ship without seeders)

# Add a package
composer require 'vendor/package:1.*' --no-interaction --update-with-all-dependencies
composer dump-autoload -o

# List all routes (for verification)
php artisan route:list

# Clear caches after .env / config changes
php artisan config:clear
php artisan cache:clear

# Smoke test: log in via curl
curl -X POST http://127.0.0.1:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@crm-erp.local\",\"password\":\"ChangeMe@123\"}'
```

```powershell
# Frontend
cd E:\CRM+ERP\frontend
npm run dev          # Vite dev server with HMR
npm run build        # Production build (for deploy)
npm install <pkg>    # Add package
```

## 12. .env essentials (`backend/.env`)

```
APP_ENV=local
APP_URL=http://localhost:8000
APP_TIMEZONE=Asia/Kolkata

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=crm_erp
DB_USERNAME=root
DB_PASSWORD=

# Drivers — set to file/sync for local; flip to redis/sqs/db for cloud
QUEUE_CONNECTION=sync
CACHE_DRIVER=file
SESSION_DRIVER=file

# Storage abstraction — change driver only, no code change
SHARED_STORAGE_DRIVER=local
SHARED_STORAGE_PATH="E:/CRM+ERP/storage"

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173

# Auth module
AUTH_ACCESS_TTL=1440
AUTH_REFRESH_TTL=43200
ADMIN_SEED_EMAIL=admin@crm-erp.local
ADMIN_SEED_PASSWORD=ChangeMe@123

# Mail (SMTP) — fill when emails are wired
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587

# Google Calendar (Module 6.2 future)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT=http://localhost:8000/api/v1/tasks/calendar/callback

# WhatsApp placeholder (Module 6.3 future)
WHATSAPP_PROVIDER=placeholder
```

`frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=CRM-ERP
```

## 13. End-to-end pipeline (the working golden path today)

```
Quotation (4.1)
   └─→ approved → Convert button creates ─→ Sales Order (4.2)
                                                └─→ approved → Create Invoice button ─→ Invoice (4.2)
                                                                                          └─→ Post → StockService.OUT writes stock_ledger
                                                                                                      └─→ Record Payment → invoice.paid_amount up; status flips

Purchase Order (3.2)
   └─→ approved → GRN (3.2)
                    └─→ Receive → StockService.IN writes stock_ledger
                                    └─→ Purchase Invoice (3.2)  (separate doc, no stock impact)
                                          └─→ Post → AP balance set

Production Batch (4.3) — stage-aware
   stage=trial:    Complete writes ONLY raw OUT (no FG IN; useful for R&D)
   stage=final:    Complete writes raw OUT + FG IN (the original behaviour)
   stage=qc:       Complete writes nothing (records pass/fail in meta.qc_results)
   parent_batch_id self-FK links Final → Trial, or QC → Final
   draft → submitted → approved → in_progress → completed → cancelled (reverses ALL ledger rows)

Sales Order (4.2) ─→ Export Invoice (4.5) ─→ Create:
                                              └─→ AUTO-spawns draft Packing List (for customs)
                                              └─→ AUTO-spawns draft Tax Invoice (for GST, INR view)
                                              └─→ FAMILY-SEQUENCE: PL+TI inherit EI's running number with their own prefix
                                                  (EI/2026/00042 → PL/2026/00042 + TAX/2026/00042)
                                            ─→ Post (no stock yet) ─→ Shipping Bill (4.5) ─→ Dispatch → StockService.OUT
                                                                                                          └─→ Cancel: reverse stock

IRM (4.6) — two-step bank flow:
  Step 1: Advance receipt → New IRM with partner + amount + (optional PO ref / proforma no.).
                            Status=received, outstanding=full amount.
  Step 2: Goods ship → open Export Lodgement (/export-lodgement/new):
            • Pick client → see IRMs (toggle to include third-party) + open EIs
            • Map IRM amounts to EIs → save → creates Lodgement (draft) + allocations
            • Each allocation: ExportInvoice.paid_amount += INR; IRM outstanding -= FCY
                               (third-party flag auto-set when IRM partner ≠ lodgement client)
          → Bank confirms: Accept (records receipt no/date) — pending rows stamp utilised
            OR Bank rejects: Reject — reverses non-utilised rows (IRM/EI restored)
            OR Per-row mark Unutilised/Rejected for partial acceptance
  Step 3: Bank realization (commission + TDS + net) → IRM status = closed

Inter-Company Invoice (5.4) ─→ Post (single txn):
   └─→ StockService.OUT (from_warehouse, from_company)
   └─→ StockService.IN  (to_warehouse,   to_company)
   └─→ creates regular Sale Invoice on seller's books    (auto INV/...)
   └─→ creates regular Purchase Invoice on buyer's books (auto PI/...)
   └─→ Cancel: reverses ALL FOUR (2 ledger reversals + 2 invoice cancels)

Stock Adjustment (3.1) → approve → StockService.ADJUSTMENT writes ledger (signed)
Stock Transfer (3.1)   → send (OUT) → receive (IN)

Salary Run (5.3)
   └─→ prepare (builds payslips from latest structures) → Post → SalaryRunPosted event
                                                            └─→ Finance auto-journal: Dr Salary expense, Cr Salary payable

Loan (5.2)
   └─→ active → recordPayment (waterfalls EMIs) → LoanPaymentReceived event
                                                    └─→ Finance auto-journal: Dr Bank/AP ↔ Cr AR/Bank per type

Auto-journal listener (5.1) subscribes to:
   InvoicePosted, InvoicePaymentReceived, PurchaseInvoicePosted,
   IrmReceived, BankRealizationRecorded,
   ProductionBatchCompleted, InterCompanyInvoicePosted,
   SalaryRunPosted, LoanPaymentReceived
   → idempotent JE creation; missing-setting → log warning + skip (does NOT block source op)

Export Incentive (6.6) workflow:
   Shipping Bill dispatched → file Drawback / IGST refund / RoDTEP claim → status pending
     → submit to govt → status filed
       → govt approves → status approved
         → bank credits the money → status credited (records credited_amount + bank_ref)
   Any non-terminal step can branch to status=rejected (records rejection_reason).

Document Templates (6.7) — PDF generation:
   Each doc type has a default template per company (seeded). Click "Download PDF" on any
   Invoice / Quotation / SO / PO / EI / TI form → backend resolves the active template,
   builds context via TemplateContextBuilder, renders Mustache → wraps in dompdf → streams.
   Edit templates at Settings → Document Templates with split-pane HTML editor + live preview
   (mock data). Saved changes apply to the next real PDF.
```

Everything writes to `stock_ledger` exclusively through `StockService`.
Everything that needs a doc number goes through `SequenceService` — which now also accepts a
user-typed code (third arg) and returns it verbatim while advancing the master counter.

## 14. Roadmap — what's left from the original 24-module plan

```
✅ 1.1 Auth + Users + Roles
✅ 1.2 Companies + Branches + Warehouses
✅ 1.3 Settings + Sequences + Audit
✅ 2.1 CRM Partners
✅ 2.2 Products + Categories + Units
✅ 2.3 Formula + Costing                           — versioned BOM, scales into Production batches
✅ 3.1 Inventory + Stock Ledger
✅ 3.2 Purchase
   4.0 — (4.1 + 4.2 are done)
✅ 4.1 Quotation
✅ 4.2 Sales (SO + Invoice + Payment)
✅ 4.3 Production Batches + Failure & Quality
✅ 4.4 Order Tracking                              — derived view over SO + Invoice + Production
✅ 4.5 Export Management                           — export invoices + shipping bills (stock OUT on dispatch)
✅ 4.6 IRM + Bank Closure                          — FCY remittance → INR allocation → bank realization
✅ 5.1 Finance + Ledger                            — CoA + Journals + Trial Balance + P&L + BS; auto-journals from 8 source events
✅ 5.2 Loan + EMI                                  — reducing-balance EMI schedule + waterfall payments
✅ 5.3 HR + Salary                                 — employees, designations, salary structures, payroll runs, payslips
✅ 5.4 Inter-Company Billing                       — one post = stock OUT/IN + Sale Invoice + Purchase Invoice on both sides
✅ 6.1 Documents (polymorphic)                     — drop-in DocumentsPanel attaches to any model
✅ 6.2 Tasks + Reminders + Google Calendar         — Calendar sync stubbed (set GOOGLE_CLIENT_ID/SECRET to enable)
✅ 6.3 Communication (Email + WhatsApp)            — WhatsApp uses pluggable provider (placeholder driver default)
✅ 6.4 Reports                                     — 9 reports: sales/purchase/stock/production/AR/AP/P&L/BS/export-realization
✅ 6.5 Dashboard                                   — privacy-first KPIs (no buyer/supplier names), gradient hero cards + sparklines + aging bars
✅ 6.6 Export Incentives                           — Drawback / IGST refund / RoDTEP claim tracking with workflow
✅ 6.7 Document Templates + PDF                    — dompdf + editable Mustache templates per (company × doc_type), Settings editor with live preview
```

**🎉 25/25 modules done.** Plus seven cross-cutting upgrades shipped 2026-05/06:
- ✅ Phase 2 SmartDropdown + inline-create modals
- ✅ Phase 4 family-sequence (PL/TI inherit EI's number)
- ✅ Phase 5 Production Trial/Final/QC stage split
- ✅ DocumentNumberField on every doc form (editable preview)
- ✅ Soft-delete code reuse via `(company_id, code, deleted_at)` indexes
- ✅ confirmDelete() centered modal replacing 39+ Popconfirms
- ✅ Performance pass — backend cache + composite indexes on hot tables

Operational items remaining (not new modules — see §15):
- Real Google Calendar sync — code path exists; needs `GOOGLE_CLIENT_ID/SECRET`.
- Real WhatsApp provider — placeholder driver active; needs vonage/twilio binding.
- Real OCR provider for Shipping Bill — `OcrProvider` interface + StubOcrProvider scaffold ship; needs Tesseract / Vision / Textract / Form Recognizer binding via `OCR_PROVIDER_CLASS` env var.
- Excel exports — Reports use CSV via `URL.createObjectURL` for now.
- Bank statement import / reconciliation.
- Multi-currency FX gain/loss auto-journals.
- Frontend production build — `npm run build` not yet verified.
- Test suite + CI — neither has been set up.

## 15. Things that are intentionally NOT done yet

- **PDF generation for Reports** — invoice/quotation/SO/PO/EI/TI go through Module 6.7 templates. The Reports module (6.4) has its own simpler PDF path via `ReportPdfService` (auto-generated HTML tables, no editable templates) — single endpoint `GET /api/v1/reports/{code}/pdf`. Custom-styled report templates are still a future enhancement if needed.
- **No Excel exports** — `maatwebsite/excel` not added. Reports export CSV client-side via `URL.createObjectURL` + `<a download>`.
- **Email sending** — `Mail::raw` works via whatever SMTP is in `.env`. No fancy mail templates beyond the placeholder substitution in `comm_templates`. PDF attachment to email is not wired (would compose `PdfService::download()` output as an attachment).
- **Real Google Calendar sync** — code path + UI exist; `GoogleCalendarService` throws when `GOOGLE_CLIENT_ID/SECRET` are empty. Install `google/apiclient`, populate env, replace stub bodies with real Google API calls.
- **Real WhatsApp provider** — `WhatsAppProvider` interface ships with a `PlaceholderWhatsAppProvider`. Install e.g. `vonage/client` or `twilio/sdk`, write a concrete implementation, swap the binding in `Modules\Comms\Providers\CommsServiceProvider`.
- **Real OCR provider for Shipping Bill** — `Modules\Export\Contracts\OcrProvider` interface ships with `StubOcrProvider` default (throws "OCR not configured"). `POST /api/v1/shipping-bills/extract-from-pdf` route exists; SB form has an "OCR from PDF" Upload button. To enable: install Tesseract / Google Vision / AWS Textract / Azure Form Recognizer SDK, write a concrete provider class implementing `extractShippingBill($filePath): array`, set `OCR_PROVIDER_CLASS=Modules\Export\Services\Ocr\YourProvider` in `.env`. The DI binding in `ExportServiceProvider::register` already auto-resolves by env var.
- **Bank statement import / reconciliation** — out of scope. Loans/Finance currently captures payments manually.
- **Multi-currency consolidation** in Finance — journals post in invoice ccy × xrate; FX gain/loss not auto-computed.
- **No queue jobs running** — `QUEUE_CONNECTION=sync` for now. For production: switch to `database` or `redis` and run `php artisan queue:work` (esp. for reminder dispatch and email sending).
- **No frontend `npm run build` verified** — only `npm run dev` (Vite HMR) is exercised.
- **No CI / test suite** — neither PHPUnit nor Vitest configured. Add when scope warrants.
- **WYSIWYG document template editor** — current Settings → Document Templates page uses raw HTML/CSS textareas + sandboxed iframe preview. Powerful but technical. A real WYSIWYG (TinyMCE / Quill / per-section drag-and-drop blocks) is a clean follow-up.
- **PowerShell tool flakiness** in this agent's environment: stdout sometimes returns empty. Fall back to `Glob` / `Read` / writing to file then reading to verify side effects when in doubt.

---

**End of CLAUDE.md.** Keep this file updated as new modules ship — section 7
(catalog), section 14 (roadmap), and section 8 (any new conventions) are the
ones that drift. Everything else stays mostly stable.
