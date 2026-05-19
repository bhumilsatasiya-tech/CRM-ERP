# Module 4.5 — Export Management

Multi-currency Export Invoices for Company A, plus Shipping Bills (BL, vessel, ports) that actually dispatch the goods.

## Tables
- `export_invoices` (header, multi-currency + incoterm + ports)
- `export_invoice_items`
- `shipping_bills` (links to one EI; carries BL/vessel/ports/dates)
- `shipping_bill_items` (one stock_ledger OUT row per line on dispatch)

## Workflows
- **Export Invoice:** `draft → posted → partially_paid → paid → cancelled`. Posting does NOT touch stock; payment status is updated by the IRM module (4.6) via `applyPaymentInr / reversePaymentInr`.
- **Shipping Bill:** `draft → dispatched → cancelled`. **Dispatch** writes `StockService::OUT` per line and bumps `export_invoice_items.shipped_qty`. **Cancel after dispatch** reverses the ledger rows.

Cancelling an EI is blocked while it has live (non-cancelled) shipping bills.

## Endpoints
```
GET|POST|PATCH|DELETE /api/v1/export-invoices[/{invoice}]
POST /api/v1/export-invoices/{invoice}/post|cancel

GET|POST|PATCH|DELETE /api/v1/shipping-bills[/{bill}]
POST /api/v1/shipping-bills/{bill}/dispatch|cancel
```

## Permissions
`export.invoice.view/create/update/delete/post`, `export.shipping.view/create/update/delete/dispatch`.

## Sequences used
`export_invoice` (prefix `EI`) and `shipping_bill` (prefix `SB`) — both already seeded.
