<?php

namespace Modules\ExportIncentives\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\ExportIncentives\Models\ExportIncentiveClaim;
use RuntimeException;

class ExportIncentiveService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return ExportIncentiveClaim::query()
            ->with(['shippingBill:id,code', 'exportInvoice:id,code'])
            ->when(($filters['type'] ?? '') !== '',   fn(Builder $q) => $q->where('type', $filters['type']))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['shipping_bill_id'] ?? null), fn(Builder $q, $v) => $q->where('shipping_bill_id', (int) $v))
            ->when(($filters['from'] ?? null), fn(Builder $q, $v) => $q->whereDate('claim_date', '>=', $v))
            ->when(($filters['to']   ?? null), fn(Builder $q, $v) => $q->whereDate('claim_date', '<=', $v))
            ->orderByDesc('claim_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $data, ?int $actorId = null): ExportIncentiveClaim
    {
        return DB::transaction(function () use ($companyId, $data, $actorId) {
            return ExportIncentiveClaim::create(array_merge($data, [
                'company_id'     => $companyId,
                'status'         => $data['status'] ?? ExportIncentiveClaim::STATUS_PENDING,
                'claim_currency' => $data['claim_currency'] ?? 'INR',
                'created_by'     => $actorId,
                'updated_by'     => $actorId,
            ]));
        });
    }

    public function update(ExportIncentiveClaim $claim, array $data, ?int $actorId = null): ExportIncentiveClaim
    {
        return DB::transaction(function () use ($claim, $data, $actorId) {
            $claim->fill($data);
            $claim->updated_by = $actorId;
            $claim->save();
            return $claim->fresh();
        });
    }

    public function delete(ExportIncentiveClaim $claim): void
    {
        if ($claim->status === ExportIncentiveClaim::STATUS_CREDITED) {
            throw new RuntimeException('Cannot delete a credited claim — reverse the credit first.');
        }
        DB::transaction(fn() => $claim->delete());
    }

    /** Move a claim to a new status. Validates legal transitions. */
    public function transition(ExportIncentiveClaim $claim, string $toStatus, array $payload = [], ?int $actorId = null): ExportIncentiveClaim
    {
        $validTo = [
            ExportIncentiveClaim::STATUS_PENDING  => [ExportIncentiveClaim::STATUS_FILED, ExportIncentiveClaim::STATUS_REJECTED],
            ExportIncentiveClaim::STATUS_FILED    => [ExportIncentiveClaim::STATUS_APPROVED, ExportIncentiveClaim::STATUS_REJECTED],
            ExportIncentiveClaim::STATUS_APPROVED => [ExportIncentiveClaim::STATUS_CREDITED, ExportIncentiveClaim::STATUS_REJECTED],
            ExportIncentiveClaim::STATUS_CREDITED => [],
            ExportIncentiveClaim::STATUS_REJECTED => [],
        ];

        if (!in_array($toStatus, $validTo[$claim->status] ?? [], true)) {
            throw new RuntimeException("Cannot transition claim from {$claim->status} to {$toStatus}.");
        }

        return DB::transaction(function () use ($claim, $toStatus, $payload, $actorId) {
            $claim->status = $toStatus;

            if ($toStatus === ExportIncentiveClaim::STATUS_CREDITED) {
                $claim->credited_amount = $payload['credited_amount'] ?? $claim->claim_amount;
                $claim->credited_date   = $payload['credited_date']   ?? now()->toDateString();
                $claim->bank_ref        = $payload['bank_ref']        ?? $claim->bank_ref;
            }
            if ($toStatus === ExportIncentiveClaim::STATUS_REJECTED) {
                $claim->rejection_reason = $payload['rejection_reason'] ?? null;
            }

            $claim->updated_by = $actorId;
            $claim->save();
            return $claim->fresh();
        });
    }
}
