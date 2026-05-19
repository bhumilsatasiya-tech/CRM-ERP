# CRM + ERP — Enterprise System

Production-grade CRM + ERP for two-company operation (Company A: Export, Company B: Supplying).

## Stack
- **Backend:** Laravel 11 (PHP 8.2+), MySQL 8, Sanctum, Spatie Permission, Activitylog
- **Frontend:** React 18 + TypeScript + Vite, Ant Design 5, Redux Toolkit + RTK Query
- **Local:** XAMPP (Apache + MySQL) on Windows
- **Cloud-ready:** swap `.env` to deploy on Forge/Vapor/AWS without code changes

## Repository layout

```
E:\CRM+ERP
├── backend/
│   └── Modules/                   # Each business module is self-contained
│       ├── Auth/                  # Module 1.1 — Auth + Users + Roles + Permissions
│       ├── Companies/             # Module 1.2 — (future)
│       └── ...
├── frontend/
│   └── src/modules/
│       ├── 01-auth/               # Module 1.1 frontend
│       └── ...
├── database/                      # Schema dumps, ERD
├── docs/modules/                  # Per-module documentation
├── scripts/                       # Windows .bat helpers
└── storage/                       # File uploads (local) — switches to S3 in cloud
```

## Modules — build order

| # | Module | Backend folder | Frontend folder | Status |
|---|---|---|---|---|
| 1.1 | Auth + Users + Roles | `backend/Modules/Auth` | `frontend/src/modules/01-auth` | ✅ Generated |
| 1.2 | Companies + Branches + Warehouses | `backend/Modules/Companies` | `frontend/src/modules/02-companies` | ⏳ Pending |
| 1.3 | Settings + Sequences + Audit | `backend/Modules/Settings` | `frontend/src/modules/03-settings` | ⏳ Pending |
| 2.1 | CRM Partners | `backend/Modules/Crm` | `frontend/src/modules/04-crm` | ⏳ Pending |
| 2.2 | Products + Categories | `backend/Modules/Products` | `frontend/src/modules/05-products` | ⏳ Pending |
| 2.3 | Formula + Costing | `backend/Modules/Formula` | `frontend/src/modules/06-formula` | ⏳ Pending |
| 3.1 | Inventory + Stock Ledger | `backend/Modules/Inventory` | `frontend/src/modules/07-inventory` | ⏳ Pending |
| 3.2 | Purchase | `backend/Modules/Purchase` | `frontend/src/modules/08-purchase` | ⏳ Pending |
| 4.1 | Quotation | `backend/Modules/Quotation` | `frontend/src/modules/09-quotation` | ⏳ Pending |
| 4.2 | Sales + Invoice | `backend/Modules/Sales` | `frontend/src/modules/10-sales` | ⏳ Pending |
| 4.3 | Production Batches | `backend/Modules/Production` | `frontend/src/modules/11-production` | ⏳ Pending |
| 4.4 | Quality + Failure | `backend/Modules/Quality` | `frontend/src/modules/12-quality` | ⏳ Pending |
| 4.5 | Order Tracking | `backend/Modules/Tracking` | `frontend/src/modules/13-tracking` | ⏳ Pending |
| 4.6 | Export + IRM + Bank | `backend/Modules/Export` | `frontend/src/modules/14-export` | ⏳ Pending |
| 5.1 | Finance + Ledger | `backend/Modules/Finance` | `frontend/src/modules/15-finance` | ⏳ Pending |
| 5.2 | Loan + EMI | `backend/Modules/Loan` | `frontend/src/modules/16-loan` | ⏳ Pending |
| 5.3 | HR + Salary | `backend/Modules/Hr` | `frontend/src/modules/17-hr` | ⏳ Pending |
| 5.4 | Inter-Company Billing | `backend/Modules/InterCompany` | `frontend/src/modules/18-inter-company` | ⏳ Pending |
| 6.1 | Documents | `backend/Modules/Documents` | `frontend/src/modules/19-documents` | ⏳ Pending |
| 6.2 | Tasks + Calendar | `backend/Modules/Tasks` | `frontend/src/modules/20-tasks` | ⏳ Pending |
| 6.3 | Communication | `backend/Modules/Communication` | `frontend/src/modules/21-communication` | ⏳ Pending |
| 6.4 | Reports | `backend/Modules/Reports` | `frontend/src/modules/22-reports` | ⏳ Pending |
| 6.5 | Dashboard | `backend/Modules/Dashboard` | `frontend/src/modules/23-dashboard` | ⏳ Pending |

## Quick start

See [docs/modules/01-auth.md](docs/modules/01-auth.md) for Module 1.1 setup.

## Prerequisites (install before running)

| Tool | Version | Purpose |
|---|---|---|
| PHP | 8.2+ | Laravel runtime (XAMPP includes it) |
| Composer | 2.x | PHP dependency manager |
| Node.js | 20 LTS | Frontend build |
| MySQL | 8.x | Database (XAMPP includes it) |
| Git | latest | Version control |
