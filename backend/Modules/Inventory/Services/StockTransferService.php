<?php

namespace Modules\Inventory\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Inventory\Models\StockLedger;
use Modules\Inventory\Models\StockTransfer;
use Modules\Inventory\Models\StockTransferLine;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class StockTransferService
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
        $from    = $filters['from'] ?? null;
        $to      = $filters['to'] ?? null;

        return StockTransfer::query()
            ->with(['fromWarehouse:id,code,name', 'toWarehouse:id,code,name', 'lines'])
            ->withCount('lines')
            ->when($search !== '', fn(Builder $q) => $q->where('code', 'like', "%{$search}%"))
            ->when($status !== '', fn(Builder $q) => $q->where('status', $status))
            ->when($from, fn(Builder $q) => $q->whereDate('transfer_date', '>=', $from))
            ->when($to,   fn(Builder $q) => $q->whereDate('transfer_date', '<=', $to))
            ->orderByDesc('transfer_date')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): StockTransfer
    {
        if ((int) $header['from_warehouse_id'] === (int) $header['to_warehouse_id']) {
            throw new RuntimeException('Source and destination warehouses must differ.');
        }
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'stock_transfer', $header['code'] ?? null);

            /** @var StockTransfer $tr */
            $tr = StockTransfer::create([
                'company_id'            => $companyId,
                'code'                  => $code,
                'from_warehouse_id'     => $header['from_warehouse_id'],
                'to_warehouse_id'       => $header['to_warehouse_id'],
                'transfer_date'         => $header['transfer_date'] ?? now()->toDateString(),
                'expected_arrival_date' => $header['expected_arrival_date'] ?? null,
                'status'                => StockTransfer::STATUS_DRAFT,
                'notes'                 => $header['notes'] ?? null,
                'meta'                  => $header['meta'] ?? null,
                'created_by'            => $actorId,
                'updated_by'            => $actorId,
            ]);

            $this->syncLines($tr, $lines);
            return $tr->fresh(['lines']);
        });
    }

    public function update(StockTransfer $tr, array $header, ?array $lines, ?int $actorId = null): StockTransfer
    {
        if ($tr->status !== StockTransfer::STATUS_DRAFT) {
            throw new RuntimeException('Only draft transfers can be edited.');
        }
        return DB::transaction(function () use ($tr, $header, $lines, $actorId) {
            $tr->fill($header);
            $tr->updated_by = $actorId;
            $tr->save();
            if (is_array($lines)) $this->syncLines($tr, $lines);
            return $tr->fresh(['lines']);
        });
    }

    public function delete(StockTransfer $tr): void
    {
        if ($tr->status !== StockTransfer::STATUS_DRAFT) {
            throw new RuntimeException('Only draft transfers can be deleted.');
        }
        DB::transaction(fn() => $tr->delete());
    }

    /** draft → sent: writes TRANSFER_OUT for each line. */
    public function send(StockTransfer $tr, ?int $actorId = null): StockTransfer
    {
        if ($tr->status !== StockTransfer::STATUS_DRAFT) {
            throw new RuntimeException('Only draft transfers can be sent.');
        }
        if (! $tr->lines()->exists()) {
            throw new RuntimeException('Cannot send a transfer with no lines.');
        }
        return DB::transaction(function () use ($tr, $actorId) {
            foreach ($tr->lines as $line) {
                $out = $this->stock->record([
                    'company_id'     => $tr->company_id,
                    'warehouse_id'   => $tr->from_warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::TRANSFER_OUT,
                    'qty'            => (float) $line->qty,
                    'rate'           => (float) $line->rate,
                    'reference_type' => StockTransfer::class,
                    'reference_id'   => $tr->id,
                    'reference_no'   => $tr->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'serial_no'      => $line->serial_no,
                    'posted_at'      => $tr->transfer_date,
                    'notes'          => "Transfer out to warehouse #{$tr->to_warehouse_id}",
                    'created_by'     => $actorId,
                ]);
                $line->forceFill(['out_ledger_id' => $out->id])->save();
            }
            $tr->forceFill([
                'status'  => StockTransfer::STATUS_SENT,
                'sent_by' => $actorId,
                'sent_at' => now(),
            ])->save();
            return $tr->fresh(['lines']);
        });
    }

    /** sent → received: writes TRANSFER_IN for each line at the destination. */
    public function receive(StockTransfer $tr, ?int $actorId = null): StockTransfer
    {
        if ($tr->status !== StockTransfer::STATUS_SENT) {
            throw new RuntimeException('Only sent transfers can be received.');
        }
        return DB::transaction(function () use ($tr, $actorId) {
            foreach ($tr->lines as $line) {
                $in = $this->stock->record([
                    'company_id'     => $tr->company_id,
                    'warehouse_id'   => $tr->to_warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::TRANSFER_IN,
                    'qty'            => (float) $line->qty,
                    'rate'           => (float) $line->rate,
                    'reference_type' => StockTransfer::class,
                    'reference_id'   => $tr->id,
                    'reference_no'   => $tr->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'serial_no'      => $line->serial_no,
                    'posted_at'      => now(),
                    'notes'          => "Transfer in from warehouse #{$tr->from_warehouse_id}",
                    'created_by'     => $actorId,
                ]);
                $line->forceFill(['in_ledger_id' => $in->id])->save();
            }
            $tr->forceFill([
                'status'              => StockTransfer::STATUS_RECEIVED,
                'received_by'         => $actorId,
                'received_at'         => now(),
                'actual_arrival_date' => now()->toDateString(),
            ])->save();
            return $tr->fresh(['lines']);
        });
    }

    public function cancel(StockTransfer $tr, ?string $reason = null, ?int $actorId = null): StockTransfer
    {
        if ($tr->status === StockTransfer::STATUS_CANCELLED) {
            throw new RuntimeException('Already cancelled.');
        }
        return DB::transaction(function () use ($tr, $reason, $actorId) {
            // Reverse any ledger rows that were posted
            foreach ($tr->lines as $line) {
                if ($line->in_ledger_id)  $this->stock->reverse($line->in_ledger_id,  "Cancelled transfer {$tr->code}", $actorId);
                if ($line->out_ledger_id) $this->stock->reverse($line->out_ledger_id, "Cancelled transfer {$tr->code}", $actorId);
            }
            $tr->forceFill([
                'status'              => StockTransfer::STATUS_CANCELLED,
                'cancelled_by'        => $actorId,
                'cancelled_at'        => now(),
                'cancellation_reason' => $reason,
            ])->save();
            return $tr;
        });
    }

    private function syncLines(StockTransfer $tr, array $lines): void
    {
        $tr->lines()->delete();
        foreach ($lines as $row) {
            $qty  = (float) $row['qty'];
            $rate = (float) ($row['rate'] ?? 0);
            StockTransferLine::create([
                'transfer_id' => $tr->id,
                'product_id'  => $row['product_id'],
                'qty'         => $qty,
                'rate'        => $rate,
                'value'       => round($qty * $rate, 2),
                'batch_no'    => $row['batch_no'] ?? null,
                'expiry_date' => $row['expiry_date'] ?? null,
                'serial_no'   => $row['serial_no'] ?? null,
                'notes'       => $row['notes'] ?? null,
            ]);
        }
    }
}
