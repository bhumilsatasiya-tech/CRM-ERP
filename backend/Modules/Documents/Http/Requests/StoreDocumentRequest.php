<?php

namespace Modules\Documents\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('document.upload') ?? false; }

    public function rules(): array
    {
        return [
            'file'             => ['required', 'file', 'max:25600'], // 25 MB
            'attachable_type'  => ['required', 'string', 'max:191'],
            'attachable_id'    => ['required', 'integer'],
            'category'         => ['nullable', 'string', 'in:kyc,coa,msds,photo,contract,invoice_pdf,other'],
            'notes'            => ['nullable', 'string'],
        ];
    }
}
