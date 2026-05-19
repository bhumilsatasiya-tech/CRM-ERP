<?php

namespace Modules\Hr\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('hr.employee.create') ?? false; }

    public function rules(): array
    {
        return [
            'name'            => ['required', 'string', 'max:191'],
            'email'           => ['nullable', 'email', 'max:191'],
            'phone'           => ['nullable', 'string', 'max:32'],
            'designation_id'  => ['nullable', 'integer', 'exists:designations,id'],
            'user_id'         => ['nullable', 'integer', 'exists:users,id'],
            'joining_date'    => ['nullable', 'date'],
            'date_of_birth'   => ['nullable', 'date'],
            'gender'          => ['nullable', 'string', 'in:male,female,other'],
            'status'          => ['nullable', 'string', 'in:active,inactive,resigned,terminated'],
            'pan'             => ['nullable', 'string', 'max:32'],
            'aadhar'          => ['nullable', 'string', 'max:32'],
            'bank_name'       => ['nullable', 'string', 'max:128'],
            'bank_account_no' => ['nullable', 'string', 'max:64'],
            'bank_ifsc'       => ['nullable', 'string', 'max:32'],
            'notes'           => ['nullable', 'string'],
        ];
    }
}
