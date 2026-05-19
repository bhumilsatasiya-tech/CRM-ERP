<?php

namespace Modules\Projects\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Projects\Models\ProjectCostEntry;

class StoreCostEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('project.cost.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'category'    => ['required', 'in:' . implode(',', ProjectCostEntry::CATEGORIES)],
            'description' => ['required', 'string', 'max:255'],
            'qty'         => ['nullable', 'numeric', 'min:0'],
            'unit'        => ['nullable', 'string', 'max:16'],
            'rate'        => ['nullable', 'numeric', 'min:0'],
            'amount'      => ['nullable', 'numeric', 'min:0'],
            'partner_id'  => ['nullable', 'integer', 'exists:partners,id'],
            'entry_date'  => ['nullable', 'date'],
            'is_planned'  => ['nullable', 'boolean'],
            'notes'       => ['nullable', 'string'],
        ];
    }
}
