<?php

namespace Modules\Hr\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalaryRunResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'period' => $this->period,
            'period_start' => $this->period_start?->toDateString(),
            'period_end'   => $this->period_end?->toDateString(),
            'status' => $this->status,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'payslips' => $this->whenLoaded('payslips', fn() => $this->payslips->map(fn($p) => [
                'id' => $p->id,
                'employee_id' => $p->employee_id,
                'employee_name' => $p->employee?->name,
                'employee_code' => $p->employee?->code,
                'gross' => (float) $p->gross,
                'total_deductions' => (float) $p->total_deductions,
                'net_pay' => (float) $p->net_pay,
                'breakdown' => $p->breakdown,
                'paid_at' => $p->paid_at?->toIso8601String(),
                'payment_ref' => $p->payment_ref,
            ])->values()),
            'payslips_count' => $this->whenCounted('payslips'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
