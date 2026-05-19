<?php

namespace Modules\Export\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Models\ExportInvoiceItem;
use Modules\Export\Models\ShippingBill;
use Modules\Export\Models\ShippingBillItem;
use Modules\Inventory\Models\StockLedger;
use Modules\Inventory\Services\StockService;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class ShippingBillService
{
    public function __construct(
        private StockService $stock,
        private SequenceService $sequences,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return ShippingBill::query()
            ->with(['exportInvoice:id,code,partner_id', 'warehouse:id,code,name'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['export_invoice_id'] ?? null), fn(Builder $q, $v) => $q->where('export_invoice_id', (int) $v))
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): ShippingBill
    {
        if (count($lines) === 0) {
            throw new RuntimeException('A shipping bill must have at least one line.');
        }
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'shipping_bill', $header['code'] ?? null);
            $sb = ShippingBill::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => ShippingBill::STATUS_DRAFT,
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncLines($sb, $lines);
            return $sb->fresh(['items.product', 'exportInvoice', 'warehouse']);
        });
    }

    public function update(ShippingBill $sb, array $header, ?array $lines, ?int $actorId = null): ShippingBill
    {
        if (! $sb->isEditable()) throw new RuntimeException('Only draft shipping bills can be edited.');
        return DB::transaction(function () use ($sb, $header, $lines, $actorId) {
            $sb->fill($header); $sb->updated_by = $actorId; $sb->save();
            if (is_array($lines)) $this->syncLines($sb, $lines);
            return $sb->fresh(['items.product', 'exportInvoice', 'warehouse']);
        });
    }

    public function delete(ShippingBill $sb): void
    {
        if (! $sb->isEditable()) throw new RuntimeException('Only draft shipping bills can be deleted.');
        DB::transaction(fn() => $sb->delete());
    }

    /**
     * Dispatch — writes one stock_ledger OUT row per line and bumps export_invoice_items.shipped_qty.
     */
    public function dispatch(ShippingBill $sb, ?int $actorId = null): ShippingBill
    {
        if ($sb->status !== ShippingBill::STATUS_DRAFT) {
            throw new RuntimeException('Only draft shipping bills can be dispatched.');
        }
        if (! $sb->items()->exists()) throw new RuntimeException('Cannot dispatch a shipping bill with no lines.');

        return DB::transaction(function () use ($sb, $actorId) {
            $ei = $sb->exportInvoice;
            foreach ($sb->items as $line) {
                $ledger = $this->stock->record([
                    'company_id'     => $sb->company_id,
                    'warehouse_id'   => $sb->warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::OUT,
                    'qty'            => (float) $line->qty,
                    'rate'           => 0,
                    'reference_type' => ShippingBill::class,
                    'reference_id'   => $sb->id,
                    'reference_no'   => $sb->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'posted_at'      => now(),
                    'notes'          => "Shipping bill {$sb->code}" . ($ei ? " for EI {$ei->code}" : ''),
                    'created_by'     => $actorId,
                ]);
                $line->forceFill(['ledger_id' => $ledger->id])->save();

                if ($line->export_invoice_item_id) {
                    ExportInvoiceItem::where('id', $line->export_invoice_item_id)
                        ->increment('shipped_qty', (float) $line->qty);
                }
            }

            $sb->forceFill([
                'status'        => ShippingBill::STATUS_DISPATCHED,
                'dispatched_at' => now(),
                'dispatched_by' => $actorId,
                'updated_by'    => $actorId,
            ])->save();

            return $sb->fresh(['items.product', 'exportInvoice', 'warehouse']);
        });
    }

    public function cancel(ShippingBill $sb, ?string $reason = null, ?int $actorId = null): ShippingBill
    {
        if ($sb->status === ShippingBill::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        return DB::transaction(function () use ($sb, $reason, $actorId) {
            if ($sb->status === ShippingBill::STATUS_DISPATCHED) {
                foreach ($sb->items as $line) {
                    if ($line->ledger_id) {
                        $this->stock->reverse($line->ledger_id, "Cancelled shipping bill {$sb->code}", $actorId);
                    }
                    if ($line->export_invoice_item_id) {
                        ExportInvoiceItem::where('id', $line->export_invoice_item_id)
                            ->decrement('shipped_qty', (float) $line->qty);
                    }
                }
            }
            $sb->forceFill([
                'status'              => ShippingBill::STATUS_CANCELLED,
                'cancelled_at'        => now(),
                'cancelled_by'        => $actorId,
                'cancellation_reason' => $reason,
                'updated_by'          => $actorId,
            ])->save();
            return $sb;
        });
    }

    private function syncLines(ShippingBill $sb, array $lines): void
    {
        $sb->items()->delete();
        foreach ($lines as $row) {
            ShippingBillItem::create([
                'shipping_bill_id'       => $sb->id,
                'export_invoice_item_id' => $row['export_invoice_item_id'] ?? null,
                'product_id'             => $row['product_id'],
                'hsn_code'               => $row['hsn_code'] ?? null,
                'qty'                    => (float) $row['qty'],
                'batch_no'               => $row['batch_no'] ?? null,
                'expiry_date'            => $row['expiry_date'] ?? null,
                'notes'                  => $row['notes'] ?? null,
            ]);
        }
    }
}
