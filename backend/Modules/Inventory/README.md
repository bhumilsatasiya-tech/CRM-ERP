# Module 3.1 — Inventory + Stock Ledger

**Menu position:** #11 — Inventory & Stock
**Folder:** `backend/Modules/Inventory`
**Frontend twin:** `frontend/src/modules/06-inventory`
**Depends on:** Auth, Companies, Settings, Products

## Architectural decision: append-only ledger

`stock_ledger` is **immutable**. Every movement creates a new row — no updates, no deletes (except via reversal). This gives:
- Perfect audit history of every grain of stock
- Point-in-time valuation (`SUM(value) WHERE posted_at <= X`)
- Race-safe concurrency via row-locking on `(product_id, warehouse_id, batch_no)`
- Trustworthy month-end close

Cancelling a movement creates a **reversal** row that is the negative of the original; both rows remain in history.

## Tables owned

| Table | Purpose |
|---|---|
| `stock_ledger` | Every IN/OUT/TRANSFER_IN/TRANSFER_OUT/ADJUSTMENT, with running balance |
| `stock_adjustments` + `stock_adjustment_lines` | Manual corrections (header + items), approval workflow |
| `stock_transfers` + `stock_transfer_lines` | Warehouse-to-warehouse movement with send/receive lifecycle |

## The single API: `StockService`

Every other module (Purchase GRN, Production batch, Sales Invoice, Export shipment, Adjustment, Transfer) calls one of:

```php
$stock->record([
    'company_id'      => $companyId,
    'warehouse_id'    => $warehouseId,
    'product_id'      => $productId,
    'movement_type'   => StockLedger::IN,        // or OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
    'qty'             => 100.0,
    'rate'            => 350.0,
    'reference_type'  => 'Modules\\Purchase\\Models\\Grn',
    'reference_id'    => $grn->id,
    'reference_no'    => $grn->code,
    'batch_no'        => 'BATCH-2026-001',
    'expiry_date'     => '2027-12-31',
    'posted_at'       => now(),
]);

$stock->getCurrentStock($productId, $warehouseId, batchNo: null);
$stock->getStockHistory($productId, $warehouseId, $from, $to);
$stock->reverse($ledgerId, $reason);
```

`record()` is wrapped in a DB transaction with a `lockForUpdate` row lock on the (product, warehouse, batch_no) combination. Concurrent writes from two users cannot corrupt the running balance.

## Movement types

| Type | Sign | Common origin |
|---|---|---|
| `IN` | + | GRN (purchase receipt), Batch finished goods |
| `OUT` | − | Sales invoice, Batch consumption, Export dispatch |
| `TRANSFER_OUT` | − | Sending warehouse |
| `TRANSFER_IN` | + | Receiving warehouse |
| `ADJUSTMENT` | ± | Stock count, damage, write-off |
| `OPENING` | + | Opening balance entry (one-time per product per warehouse) |

## Stock Adjustment workflow

```
draft → submitted → approved (writes to ledger) → cancelled
```

Only on `approved` does the `StockService::record()` get called. Lines marked `cancelled` produce reversal rows.

## Stock Transfer workflow

```
draft → sent (TRANSFER_OUT writes) → received (TRANSFER_IN writes) → cancelled
```

Between **sent** and **received** the goods are "in transit" — visible in the source warehouse as zero, but tracked under a "Transit" warehouse if your config wires one. (Default: stock leaves source on send, arrives at dest on receive — gap counted as in-transit by ledger query.)

## API endpoints

```
# Ledger (read-only viewer)
GET    /stock/ledger                           paginated, filter by product/warehouse/date/type
GET    /stock/current                          pivot: product × warehouse current balances

# Adjustments
GET    /stock/adjustments                      list
POST   /stock/adjustments                      create draft
GET    /stock/adjustments/{adjustment}         show
PUT    /stock/adjustments/{adjustment}         update (only when status=draft)
DELETE /stock/adjustments/{adjustment}         soft-delete (only when status=draft)
POST   /stock/adjustments/{adjustment}/submit  draft → submitted
POST   /stock/adjustments/{adjustment}/approve submitted → approved (writes ledger)
POST   /stock/adjustments/{adjustment}/cancel  any → cancelled (reverses if approved)

# Transfers
GET    /stock/transfers
POST   /stock/transfers
GET    /stock/transfers/{transfer}
PUT    /stock/transfers/{transfer}
DELETE /stock/transfers/{transfer}
POST   /stock/transfers/{transfer}/send        draft → sent (TRANSFER_OUT)
POST   /stock/transfers/{transfer}/receive     sent → received (TRANSFER_IN)
POST   /stock/transfers/{transfer}/cancel      any → cancelled

# Reports
GET    /stock/reports/low-stock                products at/below reorder level
GET    /stock/reports/valuation?as_of=         total stock value at date
```
