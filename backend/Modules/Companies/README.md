# Module 1.2 — Companies + Branches + Warehouses

**Menu position:** #2 — Company Management
**Folder:** `backend/Modules/Companies`
**Frontend twin:** `frontend/src/modules/02-companies`
**Depends on:** Module 1.1 (Auth)

## Why this is foundation

The system runs **two companies** out of one installation:
- **Company A** — Export company (creates export invoices, IRM, bank closure)
- **Company B** — Supplying company (supplies products to A, profit-share billing)

From this module onward, every business table (partners, products, sales orders, batches, invoices, journal entries, etc.) carries a `company_id` and is filtered by the **active company** the user has selected via the topbar switcher.

## Tables owned

| Table | Purpose |
|---|---|
| `companies` | Company master — type: `export` or `supplying` |
| `branches` | Branches under each company |
| `warehouses` | Storage locations under company / branch |
| `user_companies` | Pivot — which users can access which companies |

## Components shipped

- `BelongsToCompany` trait — auto-fills `company_id` on create + global query scope to filter by active company
- `EnsureCompanyContext` middleware — reads `X-Company-Id` header, validates user access, binds active company to container
- 3 controllers + services + policies (Company, Branch, Warehouse)
- Pre-seeded **Company A (export) + Company B (supplying)** + their default branches + warehouses
- React `<CompanySwitcher>` component for the topbar

## API endpoints (`/api/v1`)

```
GET    /companies                   list (super-admin: all; user: only assigned)
POST   /companies                   create                      [can:company.create]
GET    /companies/{company}         show
PUT    /companies/{company}         update                      [can:company.update]
DELETE /companies/{company}         soft-delete                 [can:company.delete]

GET    /companies/{company}/branches            list branches
POST   /companies/{company}/branches            create branch
PUT    /branches/{branch}                       update branch
DELETE /branches/{branch}                       delete branch

GET    /companies/{company}/warehouses          list warehouses
POST   /companies/{company}/warehouses          create warehouse
PUT    /warehouses/{warehouse}                  update warehouse
DELETE /warehouses/{warehouse}                  delete warehouse

POST   /companies/{company}/users/{user}        assign user to company
DELETE /companies/{company}/users/{user}        remove user from company
GET    /me/companies                            list current user's companies
POST   /me/active-company                       set default + active company
```
