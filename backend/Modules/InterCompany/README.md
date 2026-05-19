# Module 5.4 — Inter-Company Billing

Company B (supplying) sells to Company A (export) under inter-company terms with a configurable profit %. **One** post creates the mirror pair: a regular Sale Invoice on B's side + a regular Purchase Invoice on A's side, plus paired stock OUT/IN ledger writes.

## Tables
- `inter_company_invoices` (header, spans two companies — does NOT use `BelongsToCompany`)
- `inter_company_invoice_items` (lines: cost_rate, sell_rate, paired ledger ids)

## Workflow
```
draft → post ─► OUT from from_warehouse (B-side ledger)
              ─► IN  to to_warehouse  (A-side ledger)
              ─► creates Sale Invoice on from_company (auto seq INV)
              ─► creates Purchase Invoice on to_company (auto seq PI)
       ↓
       cancel → reverses ALL four (2 ledger reversals + 2 invoice cancels)
```

## Settings prerequisite

Each company that participates in inter-company billing needs a setting telling the service which **partner** in its CRM represents the counterpart company.

Setting key format: `intercompany.partner_for_company_<other_id>` at `company` scope.

For two companies A (id 1) and B (id 2):

- In Company B's settings: `intercompany.partner_for_company_1` = `<partner_id of A in B's CRM>` (used when posting B → A; this becomes the "Client" on B's sale invoice).
- In Company A's settings: `intercompany.partner_for_company_2` = `<partner_id of B in A's CRM>` (used when posting B → A; this becomes the "Supplier" on A's purchase invoice).

If either is missing, post fails with a clear message naming the missing key.

## Endpoints
```
GET|POST|PATCH|DELETE /api/v1/inter-company-invoices[/{invoice}]
POST /api/v1/inter-company-invoices/{invoice}/post
POST /api/v1/inter-company-invoices/{invoice}/cancel
```

## Permissions
`intercompany.view`, `intercompany.create`, `intercompany.update`, `intercompany.delete`, `intercompany.post`, `intercompany.cancel`.

## Sequences
Uses `inter_company_invoice` (prefix `ICI`) for the ICI itself (already seeded), and `invoice` / `purchase_invoice` for the mirror docs.
