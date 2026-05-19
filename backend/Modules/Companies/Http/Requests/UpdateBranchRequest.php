<?php

namespace Modules\Companies\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('branch.update') ?? false;
    }

    public function rules(): array
    {
        $branch    = $this->route('branch');
        $branchId  = is_object($branch) ? $branch->id : $branch;
        $companyId = is_object($branch) ? $branch->company_id : null;

        return [
            'code' => [
                'sometimes', 'required', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('branches', 'code')
                    ->ignore($branchId)
                    ->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)
                    ->whereNull('deleted_at'),
            ],
            'name'           => ['sometimes', 'required', 'string', 'max:255'],
            'is_head_office' => ['nullable', 'boolean'],
            'email'          => ['nullable', 'email', 'max:255'],
            'phone'          => ['nullable', 'string', 'max:32'],
            'address_line1'  => ['nullable', 'string', 'max:255'],
            'address_line2'  => ['nullable', 'string', 'max:255'],
            'city'           => ['nullable', 'string', 'max:64'],
            'state'          => ['nullable', 'string', 'max:64'],
            'country'        => ['nullable', 'string', 'max:64'],
            'postal_code'    => ['nullable', 'string', 'max:16'],
            'gst_no'         => ['nullable', 'string', 'max:32'],
            'is_active'      => ['nullable', 'boolean'],
            'meta'           => ['nullable', 'array'],
        ];
    }
}
