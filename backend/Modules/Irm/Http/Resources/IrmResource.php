<?php

namespace Modules\Irm\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class IrmResource extends JsonResource
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

            'export_invoice_id' => $this->export_invoice_id,
            'export_invoice'    => $this->whenLoaded('exportInvoice', fn() => $this->exportInvoice ? [
                'id' => $this->exportInvoice->id, 'code' => $this->exportInvoice->code,
                'currency' => $this->exportInvoice->currency,
                'total' => (float) $this->exportInvoice->total,
                'paid_amount' => (float) $this->exportInvoice->paid_amount,
                'balance' => (float) $this->exportInvoice->balance,
            ] : null),

            'purpose'             => $this->purpose,
            'purchase_order_ref'  => $this->purchase_order_ref,
            'proforma_invoice_no' => $this->proforma_invoice_no,
            'bank_name'           => $this->bank_name,
            'remitter_name'       => $this->remitter_name,
            'bank_ref_no'         => $this->bank_ref_no,
            'irm_date'            => $this->irm_date?->toDateString(),

            'irm_amount_fcy'         => (float) $this->irm_amount_fcy,
            'outstanding_amount_fcy' => (float) $this->outstanding_amount_fcy,
            'irm_currency'           => $this->irm_currency,
            'exchange_rate'          => (float) $this->exchange_rate,
            'irm_amount_inr'         => (float) $this->irm_amount_inr,
            'outstanding_amount_inr' => (float) $this->outstanding_amount_inr,
            'purpose_code'           => $this->purpose_code,

            'status' => $this->status,

            'allocations' => $this->whenLoaded('allocations', fn() => $this->allocations->map(fn($a) => [
                'id' => $a->id,
                'export_invoice_id' => $a->export_invoice_id,
                'export_invoice' => $a->exportInvoice ? [
                    'id' => $a->exportInvoice->id, 'code' => $a->exportInvoice->code,
                    'total' => (float) $a->exportInvoice->total, 'balance' => (float) $a->exportInvoice->balance,
                ] : null,
                'shipping_bill_id' => $a->shipping_bill_id,
                'amount_fcy' => (float) $a->amount_fcy,
                'amount_inr' => (float) $a->amount_inr,
                'allocation_date' => $a->allocation_date?->toDateString(),
                'exchange_rate' => (float) $a->exchange_rate,
                'is_full_realization' => (bool) $a->is_full_realization,
                'notes' => $a->notes,
            ])->values()),

            'realizations' => $this->whenLoaded('realizations', fn() => $this->realizations->map(fn($r) => [
                'id' => $r->id,
                'realization_date' => $r->realization_date?->toDateString(),
                'bank_ref' => $r->bank_ref,
                'commission' => (float) $r->commission,
                'tds' => (float) $r->tds,
                'net_inr' => (float) $r->net_inr,
                'notes' => $r->notes,
            ])->values()),

            'allocations_count' => $this->whenCounted('allocations'),
            'realizations_count' => $this->whenCounted('realizations'),

            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
