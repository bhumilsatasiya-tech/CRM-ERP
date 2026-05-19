<?php

namespace Modules\Inventory\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Modules\Inventory\Models\StockLedger;
use RuntimeException;

/**
 * The single source of truth for stock movement.
 *
 * Every other module (Purchase GRN, Production batch, Sales Invoice, Stock Adjustment,
 * Stock Transfer, Export shipment) calls StockService::record() to write to the ledger.
 *
 * Concurrency:
 *   record() locks the (company, warehouse, product, batch_no) bucket via the most
 *   recent ledger row's lockForUpdate() inside a transaction. Two simultaneous writes
 *   for the same bucket queue safely; running balance is always correct.
 *
 * Immutability:
 *   The ledger is append-only. To "undo" a row, call reverse() — which writes a new
 *   negative-of-original row and links the two.
 */
class StockService
{
    private const SIGNED_TYPES = [
        StockLedger::OPENING      => 1,
        StockLedger::IN           => 1,
        StockLedger::TRANSFER_IN  => 1,
        StockLedger::OUT          => -1,
        StockLedger::TRANSFER_OUT => -1,
        StockLedger::ADJUSTMENT   => 0,   // sign comes from caller's qty
    ];

    /**
     * Append a stock movement.
     * Returns the persisted StockLedger row.
     *
     * Required keys in $params:
     *   company_id, warehouse_id, product_id, movement_type, qty, posted_at
     * Optional:
     *   rate, reference_type, reference_id, reference_no, batch_no, expiry_date,
     *   serial_no, notes, meta, created_by
     *
     * Notes on qty:
     *   - For IN/TRANSFER_IN/OPENING the caller passes a positive qty.
     *   - For OUT/TRANSFER_OUT the caller passes a positive qty (we sign it).
     *   - For ADJUSTMENT the caller passes a SIGNED qty (positive = stock up, negative = down).
     */
    public function record(array $params): StockLedger
    {
        $required = ['company_id', 'warehouse_id', 'product_id', 'movement_type', 'qty', 'posted_at'];
        foreach ($required as $k) {
            if (! array_key_exists($k, $params)) {
                throw new InvalidArgumentException("StockService::record requires '{$k}'.");
            }
        }
        $type = $params['movement_type'];
        if (! array_key_exists($type, self::SIGNED_TYPES)) {
            throw new InvalidArgumentException("Unknown movement_type '{$type}'.");
        }

        $qty = (float) $params['qty'];
        if ($qty === 0.0) {
            throw new InvalidArgumentException('Stock movement qty cannot be zero.');
        }
        if ($qty < 0 && $type !== StockLedger::ADJUSTMENT) {
            throw new InvalidArgumentException("Negative qty only allowed for adjustments. Use type 'out' or 'transfer_out' for outgoing movements with positive qty.");
        }

        $sign     = self::SIGNED_TYPES[$type];
        $signedQty = $type === StockLedger::ADJUSTMENT ? $qty : $qty * $sign;
        $rate     = (float) ($params['rate'] ?? 0);
        $value    = round(abs($signedQty) * $rate, 2) * ($signedQty < 0 ? -1 : 1);

        $batchKey = $params['batch_no'] ?? null;

        return DB::transaction(function () use ($params, $type, $signedQty, $rate, $value, $batchKey) {
            // Lock the most recent row in this bucket for the duration of the txn.
            // This serialises concurrent writes to the same (company, warehouse, product, batch).
            $previousBalance = (float) (StockLedger::query()
                ->where('company_id',   $params['company_id'])
                ->where('warehouse_id', $params['warehouse_id'])
                ->where('product_id',   $params['product_id'])
                ->when($batchKey !== null, fn($q) => $q->where('batch_no', $batchKey))
                ->orderByDesc('posted_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->value('balance_qty') ?? 0);

            $newBalance = $previousBalance + $signedQty;

            return StockLedger::create([
                'company_id'      => $params['company_id'],
                'warehouse_id'    => $params['warehouse_id'],
                'product_id'      => $params['product_id'],
                'movement_type'   => $type,
                'reference_type'  => $params['reference_type'] ?? null,
                'reference_id'    => $params['reference_id'] ?? null,
                'reference_no'    => $params['reference_no'] ?? null,
                'batch_no'        => $batchKey,
                'expiry_date'     => $params['expiry_date'] ?? null,
                'serial_no'       => $params['serial_no'] ?? null,
                'qty'             => $signedQty,
                'balance_qty'     => $newBalance,
                'rate'            => $rate,
                'value'           => $value,
                'posted_at'       => $params['posted_at'] ?? now(),
                'is_reversal'     => false,
                'notes'           => $params['notes'] ?? null,
                'meta'            => $params['meta'] ?? null,
                'created_by'      => $params['created_by'] ?? null,
            ]);
        });
    }

    /**
     * Reverse a previously posted ledger row by appending a negative-of-original row.
     * Marks the original `is_reversed = true` so reports skip it transparently if desired.
     */
    public function reverse(int $ledgerId, ?string $reason = null, ?int $actorId = null): StockLedger
    {
        return DB::transaction(function () use ($ledgerId, $reason, $actorId) {
            $original = StockLedger::lockForUpdate()->findOrFail($ledgerId);
            if ($original->is_reversed) {
                throw new RuntimeException("Ledger row {$ledgerId} is already reversed.");
            }
            if ($original->is_reversal) {
                throw new RuntimeException("Cannot reverse a reversal row directly.");
            }

            // Append the inverse row.
            // We re-compute the balance fresh to be safe under concurrency.
            $previousBalance = (float) (StockLedger::query()
                ->where('company_id',   $original->company_id)
                ->where('warehouse_id', $original->warehouse_id)
                ->where('product_id',   $original->product_id)
                ->when($original->batch_no !== null, fn($q) => $q->where('batch_no', $original->batch_no))
                ->orderByDesc('posted_at')->orderByDesc('id')
                ->lockForUpdate()
                ->value('balance_qty') ?? 0);

            $negQty   = -1 * (float) $original->qty;
            $negValue = -1 * (float) $original->value;

            $reversal = StockLedger::create([
                'company_id'        => $original->company_id,
                'warehouse_id'      => $original->warehouse_id,
                'product_id'        => $original->product_id,
                'movement_type'     => $original->movement_type,
                'reference_type'    => $original->reference_type,
                'reference_id'      => $original->reference_id,
                'reference_no'      => $original->reference_no,
                'batch_no'          => $original->batch_no,
                'expiry_date'       => $original->expiry_date,
                'serial_no'         => $original->serial_no,
                'qty'               => $negQty,
                'balance_qty'       => $previousBalance + $negQty,
                'rate'              => $original->rate,
                'value'             => $negValue,
                'posted_at'         => now(),
                'is_reversal'       => true,
                'reverses_ledger_id'=> $original->id,
                'notes'             => $reason ? "Reversal: {$reason}" : 'Reversal',
                'created_by'        => $actorId,
            ]);

            $original->forceFill([
                'is_reversed'           => true,
                'reversed_by_ledger_id' => $reversal->id,
            ])->save();

            return $reversal;
        });
    }

    /**
     * Get current stock for (product, warehouse, batch).
     * Reads the most recent ledger row's balance_qty.
     */
    public function getCurrentStock(int $productId, int $warehouseId, ?string $batchNo = null): float
    {
        return (float) (StockLedger::query()
            ->where('product_id',   $productId)
            ->where('warehouse_id', $warehouseId)
            ->when($batchNo !== null, fn($q) => $q->where('batch_no', $batchNo))
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->value('balance_qty') ?? 0);
    }

    /**
     * Sum of stock across all warehouses (and batches) for a product.
     */
    public function getCurrentStockTotal(int $productId, ?int $companyId = null): float
    {
        // For each (warehouse, batch_no) take the latest balance_qty and sum.
        $sub = StockLedger::query()
            ->select('warehouse_id', 'batch_no', DB::raw('MAX(id) as max_id'))
            ->where('product_id', $productId)
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->groupBy('warehouse_id', 'batch_no');

        return (float) StockLedger::query()
            ->joinSub($sub, 'latest', fn($j) => $j->on('stock_ledger.id', '=', 'latest.max_id'))
            ->sum('stock_ledger.balance_qty');
    }

    /**
     * Pivot: one row per (product, warehouse) with current balance.
     * Used by the Current Stock report page.
     */
    public function currentStockPivot(?int $companyId = null, ?int $warehouseId = null): array
    {
        $sub = StockLedger::query()
            ->select('product_id', 'warehouse_id', 'batch_no', DB::raw('MAX(id) as max_id'))
            ->when($companyId,   fn($q) => $q->where('company_id', $companyId))
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->groupBy('product_id', 'warehouse_id', 'batch_no');

        return StockLedger::query()
            ->joinSub($sub, 'latest', fn($j) => $j->on('stock_ledger.id', '=', 'latest.max_id'))
            ->with(['product:id,code,name,unit_id', 'product.unit:id,code,symbol', 'warehouse:id,code,name'])
            ->get()
            ->groupBy(fn($r) => $r->product_id . ':' . $r->warehouse_id)
            ->map(function ($rows) {
                $first = $rows->first();
                return [
                    'product_id'    => $first->product_id,
                    'product_code'  => $first->product?->code,
                    'product_name'  => $first->product?->name,
                    'unit'          => $first->product?->unit?->symbol,
                    'warehouse_id'  => $first->warehouse_id,
                    'warehouse_code'=> $first->warehouse?->code,
                    'warehouse_name'=> $first->warehouse?->name,
                    'qty'           => (float) $rows->sum('balance_qty'),
                    'value'         => (float) $rows->sum(fn($r) => (float) $r->balance_qty * (float) $r->rate),
                    'batches'       => $rows->map(fn($r) => [
                        'batch_no'    => $r->batch_no,
                        'expiry_date' => $r->expiry_date?->toDateString(),
                        'qty'         => (float) $r->balance_qty,
                    ])->values(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Total stock value as of a given date (or now if null).
     */
    public function valuationAt(?Carbon $asOf = null, ?int $companyId = null): float
    {
        $asOf = $asOf ?? now();

        $sub = StockLedger::query()
            ->select('product_id', 'warehouse_id', 'batch_no', DB::raw('MAX(id) as max_id'))
            ->where('posted_at', '<=', $asOf)
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->groupBy('product_id', 'warehouse_id', 'batch_no');

        $rows = StockLedger::query()
            ->joinSub($sub, 'latest', fn($j) => $j->on('stock_ledger.id', '=', 'latest.max_id'))
            ->select('balance_qty', 'rate')
            ->get();

        return (float) $rows->sum(fn($r) => (float) $r->balance_qty * (float) $r->rate);
    }
}
