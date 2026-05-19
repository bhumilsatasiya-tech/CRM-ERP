# Module 4.3 — Production Batches + Failure & Quality

The natural counterpart to GRN: a batch consumes raw materials and produces finished goods.

## Tables

- `production_batches` — header (status, target product, qty_planned/produced/failed, raw + finished warehouses, optional sales_order link, output batch_no/expiry, material_cost)
- `production_batch_inputs` — raw materials consumed per batch (product, qty_planned, qty_consumed, rate, line_value, source_batch_no, ledger_id)
- `production_batch_outputs` — finished/by-product/scrap produced per batch (output_type, qty_planned, qty_produced, rate, line_value, output_batch_no, expiry_date, ledger_id)
- `production_quality_checks` — pass/fail QC entries per batch (parameter, expected, observed)

## Workflow

`draft → submitted → approved → in_progress → completed`
At any point: `→ cancelled` (if was completed, all ledger rows are reversed via `StockService::reverse()`).

`complete` is the **only** step that writes to `stock_ledger`:
- For each input line: `StockService::record(OUT)` from `raw_warehouse_id`.
- For each output line with `qty_produced > 0`: `StockService::record(IN)` into `finished_warehouse_id`.
- Cost allocation: total material cost is split across non-scrap outputs in proportion to planned qty (last finished line absorbs rounding).

Each line stores its `ledger_id` so cancellation can reverse it cleanly.

## Endpoints

```
GET    /api/v1/production-batches
POST   /api/v1/production-batches
GET    /api/v1/production-batches/{batch}
PATCH  /api/v1/production-batches/{batch}
DELETE /api/v1/production-batches/{batch}

POST   /api/v1/production-batches/{batch}/submit
POST   /api/v1/production-batches/{batch}/approve
POST   /api/v1/production-batches/{batch}/start
POST   /api/v1/production-batches/{batch}/complete
POST   /api/v1/production-batches/{batch}/cancel

POST   /api/v1/production-batches/{batch}/quality-checks
DELETE /api/v1/production-batches/{batch}/quality-checks/{qc}
```

## Permissions

`production.view`, `production.create`, `production.update`, `production.delete`,
`production.submit`, `production.approve`, `production.start`, `production.complete`, `production.cancel`,
`production.quality.view`, `production.quality.record`.

## Sequence

Document numbers come from the existing `batch` sequence (prefix `BT`) seeded per company by Settings — `SequenceService::next($companyId, 'batch')`.
