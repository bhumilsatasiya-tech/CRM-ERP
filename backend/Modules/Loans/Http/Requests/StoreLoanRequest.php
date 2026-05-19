<?php

namespace Modules\Loans\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLoanRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('loan.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $loanId = $this->route('loan')?->id;
        return [
            'code'              => ['nullable', 'string', 'max:64', Rule::unique('loans', 'code')->ignore($loanId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'type'              => ['required', 'string', 'in:borrowed,given'],
            'partner_id'        => ['nullable', 'integer', 'exists:partners,id'],
            'principal'         => ['required', 'numeric', 'gt:0'],
            'interest_rate_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tenure_months'     => ['required', 'integer', 'min:1', 'max:600'],
            'start_date'        => ['required', 'date'],
            'notes'             => ['nullable', 'string'],
        ];
    }
}
