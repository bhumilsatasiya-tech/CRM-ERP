<?php

namespace Modules\Irm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBankRealizationRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('irm.close') ?? false; }

    public function rules(): array
    {
        return [
            'realization_date' => ['required', 'date'],
            'bank_ref'         => ['nullable', 'string', 'max:128'],
            'commission'       => ['nullable', 'numeric', 'min:0'],
            'tds'              => ['nullable', 'numeric', 'min:0'],
            'net_inr'          => ['nullable', 'numeric', 'min:0'],
            'notes'            => ['nullable', 'string'],
        ];
    }
}
