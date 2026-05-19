<?php

namespace Modules\Inventory\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Inventory\Models\StockAdjustment;
use Modules\Inventory\Models\StockAdjustmentLine;
use Modules\Inventory\Models\StockLedger;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class StockAdjustmentService
{
    public function __construct(
        private StockService $stock,
        private SequenceService $sequences,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        $search  = (string) ($filters['search'] ?? '');
        $status  = (string) ($filters['status'] ?? '');
        $whId    = $filters['warehouse_id'] ?? null;
        $from    = $filters['from'] ?? null;
        $to      = $filters['to'] ?? null;

        return StockAdjustment::query()
            ->with(['warehouse:id,code,name', 'lines'])
            ->withCount('lines')
            ->when($search !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($search) {
                $qq->where('code', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%");
            }))
            ->when($status !== '', fn(Builder $q) => $q->where('status', $status))
            ->when($whId, fn(Builder $q) => $q->where('warehouse_id', (int) $whId))
            ->when($from, fn(Builder $q) => $q->whereDate('adjustment_date', '>=', $from))
            ->when($to,   fn(Builder $q) => $q->whereDate('adjustment_date', '<=', $to))
            ->orderByDesc('adjustment_date')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): StockAdjustment
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'stock_adjustment', $header['code'] ?? null);

            /** @var StockAdjustment $adj */
            $adj = StockAdjustment::create([
                'company_id'      => $companyId,
                'warehouse_id'    => $header['warehouse_id'],
                'code'            => $code,
                'adjustment_date' => $header['adjustment_date'] ?? now()->toDateString(),
                'reason'          => $header['reason'] ?? 'physical_count',
                'status'          => StockAdjustment::STATUS_DRAFT,
                'notes'           => $header['notes'] ?? null,
                'meta'            => $header['meta'] ?? null,
                'created_by'      => $actorId,
                'updated_by'      => $actorId,
            ]);

            $this->syncLines($adj, $lines);
            return $adj->fresh(['lines']);
        });
    }

    public function update(StockAdjustment $adj, array $header, ?array $lines, ?int $actorId = null): StockAdjustment
    {
        if (! $adj->isEditable()) {
            throw new RuntimeException('Only draft adjustments can be edited.');
        }
        return DB::transaction(function () use ($adj, $header, $lines, $actorId) {
            $adj->fill($header);
            $adj->updated_by = $actorId;
            $adj->save();
            if (is_array($lines)) {
                $this->syncLines($adj, $lines);
            }
            return $adj->fresh(['lines']);
        });
    }

    public function delete(StockAdjustment $adj): void
    {
        if (! $adj->isEditable()) {
            throw new RuntimeException('Only draft adjustments can be deleted.');
        }
        DB::transaction(fn() => $adj->delete());
    }

    public function submit(StockAdjustment $adj, ?int $actorId = null): StockAdjustment
    {
        if ($adj->status !== StockAdjustment::STATUS_DRAFT) {
            throw new RuntimeException('Only draft adjustments can be submitted.');
        }
        if (! $adj->lines()->exists()) {
            throw new RuntimeException('Cannot submit an adjustment with no lines.');
        }
        $adj->forceFill([
            'status'       => StockAdjustment::STATUS_SUBMITTED,
            'submitted_by' => $actorId,
            'submitted_at' => now(),
        ])->save();
        return $adj;
    }

    /** Approving writes one ledger row per line. */
    public function approve(StockAdjustment $adj, ?int $actorId = null): StockAdjustment
    {
        if ($adj->status !== StockAdjustment::STATUS_SUBMITTED) {
            throw new RuntimeException('Only submitted adjustments can be approved.');
        }
        return DB::transaction(function () use ($adj, $actorId) {
            foreach ($adj->lines as $line) {
                if ((float) $line->difference === 0.0) continue;

                $ledger = $this->stock->record([
                    'company_id'     => $adj->company_id,
                    'warehouse_id'   => $adj->warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::ADJUSTMENT,
                    'qty'            => (float) $line->difference,           // signed
                    'rate'           => (float) $line->rate,
                    'reference_type' => StockAdjustment::class,
                    'reference_id'   => $adj->id,
                    'reference_no'   => $adj->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'serial_no'      => $line->serial_no,
                    'posted_at'      => $adj->adjustment_date,
                    'notes'          => "Adjustment: {$adj->reason}",
                    'created_by'     => $actorId,
                ]);
                $line->forceFill(['ledger_id' => $ledger->id])->save();
            }
            $adj->forceFill([
                'status'       => StockAdjustment::STATUS_APPROVED,
                'approved_by'  => $actorId,
                'approved_at'  => now(),
            ])->save();
            return $adj->fresh(['lines']);
        });
    }

    public function cancel(StockAdjustment $adj, ?string $reason = null, ?int $actorId = null): StockAdjustment
    {
        if ($adj->status === StockAdjustment::STATUS_CANCELLED) {
            throw new RuntimeException('Already cancelled.');
        }
        return DB::transaction(function () use ($adj, $reason, $actorId) {
            // If approved, reverse each ledger row created on approval
            if ($adj->status === StockAdjustment::STATUS_APPROVED) {
                foreach ($adj->lines as $line) {
                    if ($line->ledger_id) {
                        $this->stock->reverse($line->ledger_id, "Cancelled adjustment {$adj->code}", $actorId);
                    }
                }
            }
            $adj->forceFill([
                'status'              => StockAdjustment::STATUS_CANCELLED,
                'cancelled_by'        => $actorId,
                'cancelled_at'        => now(),
                'cancellation_reason' => $reason,
            ])->save();
            return $adj;
        });
    }

    private function syncLines(StockAdjustment $adj, array $lines): void
    {
        // Naive replace: delete + recreate (only valid in draft state).
        $adj->lines()->delete();
        foreach ($lines as $row) {
            $current = (float) ($row['current_qty'] ?? 0);
            $counted = (float) ($row['counted_qty'] ?? 0);
            $diff    = $counted - $current;
            $rate    = (float) ($row['rate'] ?? 0);
            StockAdjustmentLine::create([
                'adjustment_id' => $adj->id,
                'product_id'    => $row['product_id'],
                'current_qty'   => $current,
                'counted_qty'   => $counted,
                'difference'    => $diff,
                'rate'          => $rate,
                'value'         => round($diff * $rate, 2),
                'batch_no'      => $row['batch_no'] ?? null,
                'expiry_date'   => $row['expiry_date'] ?? null,
                'serial_no'     => $row['serial_no'] ?? null,
                'notes'         => $row['notes'] ?? null,
            ]);
        }
    }
}
