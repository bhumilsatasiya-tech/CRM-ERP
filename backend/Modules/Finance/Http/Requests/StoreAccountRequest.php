<?php

namespace Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('finance.account.create') ?? false; }

    public function rules(): array
    {
        return [
            'code'      => ['required', 'string', 'max:32'],
            'name'      => ['required', 'string', 'max:191'],
            'type'      => ['required', 'string', 'in:asset,liability,equity,income,expense'],
            'parent_id' => ['nullable', 'integer', 'exists:accounts,id'],
            'is_group'  => ['nullable', 'boolean'],
            'notes'     => ['nullable', 'string'],
        ];
    }
}
