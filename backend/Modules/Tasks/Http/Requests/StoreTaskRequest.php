<?php

namespace Modules\Tasks\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('task.create') ?? false; }

    public function rules(): array
    {
        return [
            'title'             => ['required', 'string', 'max:255'],
            'description'       => ['nullable', 'string'],
            'due_date'          => ['nullable', 'date'],
            'assignee_id'       => ['nullable', 'integer', 'exists:users,id'],
            'priority'          => ['nullable', 'string', 'in:low,med,high'],
            'related_type'      => ['nullable', 'string', 'max:191'],
            'related_id'        => ['nullable', 'integer'],
            'reminder_at'       => ['nullable', 'date'],
            'reminder_channel'  => ['nullable', 'string', 'in:email,in_app'],
        ];
    }
}
