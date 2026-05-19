<?php

namespace Modules\Templates\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentTemplateRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('template.create') ?? $this->user()?->can('template.update') ?? false; }

    public function rules(): array
    {
        return [
            'doc_type'    => ['required', 'string', 'max:32'],
            'name'        => ['required', 'string', 'max:128'],
            'html'        => ['required', 'string'],
            'css'         => ['nullable', 'string'],
            'paper_size'  => ['nullable', 'in:a4,letter,legal'],
            'orientation' => ['nullable', 'in:portrait,landscape'],
            'is_default'  => ['nullable', 'boolean'],
            'is_active'   => ['nullable', 'boolean'],
            'notes'       => ['nullable', 'string'],
        ];
    }
}
