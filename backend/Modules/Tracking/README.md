# Module 4.4 — Order Tracking

Read-only aggregator that unifies the lifecycle of a Sales Order across modules:

```
Quotation → Sales Order → Production Batches → Invoices → Payments → Stock Ledger
```

No new tables. Pure derived view over existing data.

## Endpoints

```
GET /api/v1/tracking
   query: status?, partner_id?, search?, per_page?
   returns: paginated list of open Sales Orders with computed progress percentages
            (produced_pct, invoiced_pct, paid_pct)

GET /api/v1/tracking/sales-orders/{order}
   returns: { sales_order, quotation, production: { batches, totals },
              invoices, payments_total, stock_movements, progress, timeline }
```

The `timeline` is a chronologically sorted list of events (`quotation_created`,
`quotation_approved`, `so_created`, `so_approved`, `batch_started`,
`batch_completed`, `batch_cancelled`, `invoice_created`, `invoice_posted`,
`payment_received`).

## Permission

`tracking.view` — needed for both endpoints. Granted to admin / manager / viewer in `RolePermissionSeeder`.
