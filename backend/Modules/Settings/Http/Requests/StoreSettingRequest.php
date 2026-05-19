<?php

namespace Modules\Settings\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('setting.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'scope'       => ['required', 'in:global,company,user'],
            'scope_id'    => ['nullable', 'integer'],
            'group'       => ['required', 'string', 'max:64'],
            'key'         => ['required', 'string', 'max:128'],
            'value'       => ['nullable'],
            'type'        => ['required', 'in:string,int,bool,json,select,text'],
            'label'       => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'options'     => ['nullable', 'array'],
            'is_public'   => ['nullable', 'boolean'],
        ];
    }
}
