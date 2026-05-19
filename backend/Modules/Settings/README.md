# Module 1.3 — Settings + Sequences + Audit

**Menu position:** #23 — Settings
**Folder:** `backend/Modules/Settings`
**Frontend twin:** `frontend/src/modules/03-settings`
**Depends on:** Module 1.1 (Auth), Module 1.2 (Companies)

## Tables

| Table | Purpose |
|---|---|
| `settings` | Key/value config — scope: `global` / `company` / `user` |
| `sequences` | Per-company auto-numbering (SO, INV, PO, GRN, BATCH, …) |
| `activity_log` | Cross-cutting audit log — populated by `Spatie\LogsActivity` trait on every model |

## Sequence formats

```
{prefix}/{year}/{number}     →  SO/2026/00001
{prefix}-{number}            →  INV-00001
{prefix}{year_short}{month}{number}  →  PO260500001
```

`SequenceService::next($companyId, $docType)` is **atomic** — wraps in DB::transaction with `lockForUpdate`. Safe under concurrent writes.

## Reset periods

- `never` — counter never resets
- `yearly` — counter resets to 1 on Apr 1 (configurable via fiscal_year_start) or Jan 1
- `monthly` — counter resets to 1 on the 1st of every month

## API endpoints

```
# Settings
GET    /settings                  list (filter by scope, group)
PUT    /settings/{key}            update value (scope inferred or query)
POST   /settings                  create new setting (admin)
DELETE /settings/{id}             delete (non-system only)
GET    /me/settings               current user's settings + public globals (no auth scope leak)

# Sequences
GET    /sequences                 list (filter by company)
POST   /sequences                 create
PUT    /sequences/{sequence}      update
DELETE /sequences/{sequence}      delete
GET    /sequences/{sequence}/preview-next   preview the next number without consuming it

# Audit Log (read-only)
GET    /audit-logs                paginated, filter by user / model_type / event / date range
GET    /audit-logs/{log}          show one entry
```
