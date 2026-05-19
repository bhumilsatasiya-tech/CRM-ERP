<?php

namespace Modules\Loans\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LoanResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'type' => $this->type,
            'partner_id' => $this->partner_id,
            'partner' => $this->whenLoaded('partner', fn() => $this->partner ? ['id' => $this->partner->id, 'code' => $this->partner->code, 'name' => $this->partner->name] : null),
            'principal' => (float) $this->principal,
            'interest_rate_pct' => (float) $this->interest_rate_pct,
            'tenure_months' => (int) $this->tenure_months,
            'start_date' => $this->start_date?->toDateString(),
            'emi_amount' => (float) $this->emi_amount,
            'total_payable' => (float) $this->total_payable,
            'total_interest' => (float) $this->total_interest,
            'outstanding_principal' => (float) $this->outstanding_principal,
            'status' => $this->status,
            'schedule' => $this->whenLoaded('schedule', fn() => $this->schedule->map(fn($e) => [
                'id' => $e->id, 'installment_no' => (int) $e->installment_no,
                'due_date' => $e->due_date?->toDateString(),
                'principal_component' => (float) $e->principal_component,
                'interest_component'  => (float) $e->interest_component,
                'emi_amount' => (float) $e->emi_amount,
                'paid_amount' => (float) $e->paid_amount,
                'status' => $e->status,
            ])->values()),
            'payments' => $this->whenLoaded('payments', fn() => $this->payments->map(fn($p) => [
                'id' => $p->id, 'payment_date' => $p->payment_date?->toDateString(),
                'amount' => (float) $p->amount, 'mode' => $p->mode,
                'bank_ref' => $p->bank_ref, 'notes' => $p->notes,
            ])->values()),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
