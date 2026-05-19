<?php

namespace Modules\Irm\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLodgementRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('lodgement.update') ?? false; }

    public function rules(): array
    {
        return [
            'lodgement_date'    => ['nullable', 'date'],
            'bank_receipt_no'   => ['nullable', 'string', 'max:64'],
            'bank_receipt_date' => ['nullable', 'date'],
            'partner_id'        => ['nullable', 'integer', 'exists:partners,id'],
            'notes'             => ['nullable', 'string'],
        ];
    }
}
