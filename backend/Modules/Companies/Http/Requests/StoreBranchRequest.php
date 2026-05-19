<?php

namespace Modules\Companies\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('branch.create') ?? false;
    }

    public function rules(): array
    {
        $companyId = $this->route('company')?->id ?? $this->route('company');

        return [
            'code' => [
                'required', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('branches', 'code')->where('company_id', $companyId)->whereNull('deleted_at'),
            ],
            'name'           => ['required', 'string', 'max:255'],
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
