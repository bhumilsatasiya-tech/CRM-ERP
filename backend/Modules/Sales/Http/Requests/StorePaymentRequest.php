<?php

namespace Modules\Sales\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('invoice.payment') ?? false; }

    public function rules(): array
    {
        return [
            'payment_date'  => ['nullable', 'date'],
            'amount'        => ['required', 'numeric', 'gt:0'],
            'mode'          => ['nullable', 'string', 'max:32'],
            'reference'     => ['nullable', 'string', 'max:128'],
            'currency'      => ['nullable', 'string', 'max:8'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'notes'         => ['nullable', 'string'],
        ];
    }
}
