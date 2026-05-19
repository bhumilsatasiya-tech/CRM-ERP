<?php

namespace Modules\Projects\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('project.cost.create') ?? false;
    }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $id = $this->route('project')?->id;
        return [
            'code'              => ['nullable', 'string', 'max:32', Rule::unique('projects', 'code')->ignore($id)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'name'              => ['required', 'string', 'max:255'],
            'description'       => ['nullable', 'string'],
            'target_product_id' => ['nullable', 'integer', 'exists:products,id'],
            'target_qty'        => ['nullable', 'numeric', 'min:0'],
            'unit'              => ['nullable', 'string', 'max:16'],
            'status'            => ['nullable', 'in:planning,active,completed,cancelled'],
            'start_date'        => ['nullable', 'date'],
            'end_date'          => ['nullable', 'date', 'after_or_equal:start_date'],
            'notes'             => ['nullable', 'string'],
            'meta'              => ['nullable', 'array'],
        ];
    }
}
