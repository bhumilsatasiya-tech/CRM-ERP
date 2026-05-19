<?php

namespace Modules\Export\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Export\Models\PackingList;
use Modules\Export\Models\PackingListItem;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class PackingListService
{
    public function __construct(private SequenceService $sequences) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return PackingList::query()
            ->with(['exportInvoice:id,code,partner_id,currency,total'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['export_invoice_id'] ?? null), fn(Builder $q, $v) => $q->where('export_invoice_id', (int) $v))
            ->orderByDesc('pl_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): PackingList
    {
        if (count($lines) === 0) {
            throw new RuntimeException('A packing list must have at least one line.');
        }
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'packing_list', $header['code'] ?? null);
            $pl = PackingList::create(array_merge($header, [
                'company_id' => $companyId,
                'code' => $code,
                'status' => PackingList::STATUS_DRAFT,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));
            $this->syncLines($pl, $lines);
            $this->recalcTotals($pl);
            return $pl->fresh(['items.product', 'exportInvoice']);
        });
    }

    public function update(PackingList $pl, array $header, ?array $lines, ?int $actorId = null): PackingList
    {
        if (! $pl->isEditable()) throw new RuntimeException('Only draft packing lists can be edited.');
        return DB::transaction(function () use ($pl, $header, $lines, $actorId) {
            $pl->fill($header);
            $pl->updated_by = $actorId;
            $pl->save();
            if (is_array($lines)) $this->syncLines($pl, $lines);
            $this->recalcTotals($pl);
            return $pl->fresh(['items.product', 'exportInvoice']);
        });
    }

    public function delete(PackingList $pl): void
    {
        if (! $pl->isEditable()) throw new RuntimeException('Only draft packing lists can be deleted.');
        DB::transaction(fn() => $pl->delete());
    }

    /**
     * Auto-create a draft Packing List from an Export Invoice.
     * Idempotent — if a non-cancelled PL already exists for this EI, returns it without creating a duplicate.
     * Snapshots all header + line data so the PL is a self-contained document.
     *
     * Family-sequence: the PL inherits the EI's running number with the PL prefix, so EI/2026/00042
     * spawns PL/2026/00042. Falls back to PL's own next-number if family code lookup fails.
     */
    public function createFromExportInvoice(\Modules\Export\Models\ExportInvoice $ei, ?int $actorId = null): PackingList
    {
        $existing = PackingList::query()
            ->where('export_invoice_id', $ei->id)
            ->where('status', '!=', PackingList::STATUS_CANCELLED)
            ->first();
        if ($existing) return $existing;

        $ei->loadMissing('items.product');

        // Family-sequence: derive PL code from EI's number using PL's own prefix/format.
        $familyCode = null;
        $familyNumber = SequenceService::extractFamilyNumber((string) $ei->code);
        if ($familyNumber !== null) {
            $familyCode = $this->sequences->formatWithNumber((int) $ei->company_id, 'packing_list', $familyNumber);
        }

        $header = [
            'code'                      => $familyCode,
            'export_invoice_id'         => $ei->id,
            'partner_id'                => $ei->partner_id,
            'pl_date'                   => now()->toDateString(),
            'invoice_date'              => $ei->invoice_date?->toDateString(),
            'date_of_supply'            => $ei->date_of_supply?->toDateString(),
            'transport_mode'            => $ei->transport_mode,
            'incoterm'                  => $ei->incoterm,
            'lut_no'                    => $ei->lut_no,
            'lut_date'                  => $ei->lut_date?->toDateString(),
            'tax_details'               => $ei->tax_details,
            'consignee_partner_id'      => $ei->consignee_partner_id,
            'consignee_name'            => $ei->consignee_name,
            'consignee_address'         => $ei->consignee_address,
            'consignee_country'         => $ei->consignee_country,
            'consignee_contact_person'  => $ei->consignee_contact_person,
            'consignee_phone'           => $ei->consignee_phone,
            'consignee_email'           => $ei->consignee_email,
            'consignee_registration_no' => $ei->consignee_registration_no,
            'notify_party_name'         => $ei->notify_party_name,
            'notify_party_address'      => $ei->notify_party_address,
            'port_of_loading'           => $ei->port_of_loading,
            'port_of_discharge'         => $ei->port_of_discharge,
            'loading_destination'       => $ei->loading_destination,
            'final_destination'         => $ei->final_destination,
        ];

        $lines = $ei->items->map(fn($l) => [
            'export_invoice_item_id' => $l->id,
            'product_id'             => $l->product_id,
            'hsn_code'               => $l->hsn_code,
            'qty'                    => (float) $l->qty,
            'packages'               => $l->shipper_qty != null ? (int) $l->shipper_qty : 0,
            'shipper_unit'           => $l->shipper_unit,
            'gross_weight_kg'        => 0,
            'net_weight_kg'          => 0,
            'batch_no'               => $l->batch_no,
        ])->toArray();

        if (count($lines) === 0) {
            throw new RuntimeException('Cannot generate packing list — export invoice has no lines.');
        }

        return $this->create((int) $ei->company_id, $header, $lines, $actorId);
    }

    public function finalize(PackingList $pl, ?int $actorId = null): PackingList
    {
        if ($pl->status !== PackingList::STATUS_DRAFT) {
            throw new RuntimeException('Only draft packing lists can be finalized.');
        }
        $pl->forceFill([
            'status' => PackingList::STATUS_FINALIZED,
            'finalized_at' => now(),
            'finalized_by' => $actorId,
            'updated_by'   => $actorId,
        ])->save();
        return $pl->fresh(['items.product', 'exportInvoice']);
    }

    public function cancel(PackingList $pl, ?string $reason = null, ?int $actorId = null): PackingList
    {
        if ($pl->status === PackingList::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        $pl->forceFill([
            'status' => PackingList::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => $actorId,
            'cancellation_reason' => $reason,
            'updated_by'   => $actorId,
        ])->save();
        return $pl;
    }

    private function syncLines(PackingList $pl, array $rows): void
    {
        $pl->items()->delete();
        foreach ($rows as $r) {
            PackingListItem::create([
                'packing_list_id'        => $pl->id,
                'export_invoice_item_id' => $r['export_invoice_item_id'] ?? null,
                'product_id'             => $r['product_id'],
                'hsn_code'               => $r['hsn_code'] ?? null,
                'qty'                    => (float) $r['qty'],
                'packages'               => (int) ($r['packages'] ?? 0),
                'shipper_unit'           => $r['shipper_unit'] ?? null,
                'marks'                  => $r['marks'] ?? null,
                'gross_weight_kg'        => (float) ($r['gross_weight_kg'] ?? 0),
                'net_weight_kg'          => (float) ($r['net_weight_kg'] ?? 0),
                'dimensions'             => $r['dimensions'] ?? null,
                'batch_no'               => $r['batch_no'] ?? null,
                'notes'                  => $r['notes'] ?? null,
            ]);
        }
    }

    private function recalcTotals(PackingList $pl): void
    {
        $items = $pl->items()->get();
        $pl->forceFill([
            'total_packages'  => (int) $items->sum('packages'),
            'gross_weight_kg' => round((float) $items->sum('gross_weight_kg'), 3),
            'net_weight_kg'   => round((float) $items->sum('net_weight_kg'), 3),
        ])->save();
    }
}
