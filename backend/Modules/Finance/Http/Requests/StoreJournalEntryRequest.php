<?php

namespace Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJournalEntryRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('finance.journal.create') ?? false; }

    public function rules(): array
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $jeId = $this->route('journal')?->id ?? $this->route('entry')?->id;
        return [
            'code'            => ['nullable', 'string', 'max:64', Rule::unique('journal_entries', 'code')->ignore($jeId)->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q)->whereNull('deleted_at')],
            'entry_date'      => ['required', 'date'],
            'narration'       => ['nullable', 'string', 'max:255'],
            'reference_no'    => ['nullable', 'string', 'max:64'],
            'lines'                   => ['required', 'array', 'min:2'],
            'lines.*.account_id'      => ['required', 'integer', 'exists:accounts,id'],
            'lines.*.debit'           => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit'          => ['nullable', 'numeric', 'min:0'],
            'lines.*.narration'       => ['nullable', 'string', 'max:255'],
        ];
    }
}
