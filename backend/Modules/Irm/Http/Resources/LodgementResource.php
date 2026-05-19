<?php

namespace Modules\Irm\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LodgementResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'partner_id' => $this->partner_id,
            'partner'    => $this->whenLoaded('partner', fn() => $this->partner ? [
                'id' => $this->partner->id, 'code' => $this->partner->code, 'name' => $this->partner->name,
            ] : null),

            'lodgement_date'    => $this->lodgement_date?->toDateString(),
            'bank_receipt_no'   => $this->bank_receipt_no,
            'bank_receipt_date' => $this->bank_receipt_date?->toDateString(),
            'status'            => $this->status,
            'rejection_reason'  => $this->rejection_reason,
            'notes'             => $this->notes,

            'allocations' => $this->whenLoaded('allocations', fn() => $this->allocations->map(fn($a) => [
                'id' => $a->id,
                'irm_id' => $a->irm_id,
                'irm' => $a->irm ? [
                    'id' => $a->irm->id, 'code' => $a->irm->code,
                    'currency' => $a->irm->irm_currency,
                    'outstanding_amount_fcy' => (float) $a->irm->outstanding_amount_fcy,
                    'irm_date'      => $a->irm->irm_date?->toDateString(),
                    'partner_id'    => $a->irm->partner_id,
                    'partner_code'  => optional($a->irm->partner)->code,
                    'partner_name'  => optional($a->irm->partner)->name,
                    'remitter_name' => $a->irm->remitter_name,
                    'bank_ref_no'   => $a->irm->bank_ref_no,
                ] : null,
                'export_invoice_id' => $a->export_invoice_id,
                'export_invoice' => $a->exportInvoice ? [
                    'id' => $a->exportInvoice->id, 'code' => $a->exportInvoice->code,
                    'total' => (float) $a->exportInvoice->total, 'balance' => (float) $a->exportInvoice->balance,
                ] : null,
                'amount_fcy' => (float) $a->amount_fcy,
                'amount_inr' => (float) $a->amount_inr,
                'exchange_rate' => (float) $a->exchange_rate,
                'allocation_date' => $a->allocation_date?->toDateString(),
                'is_full_realization'    => (bool) $a->is_full_realization,
                'is_third_party_payment' => (bool) $a->is_third_party_payment,
                'utilization_status' => $a->utilization_status,
                'utilization_note'   => $a->utilization_note,
                'notes' => $a->notes,
            ])->values()),

            'allocations_count' => $this->whenCounted('allocations'),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
