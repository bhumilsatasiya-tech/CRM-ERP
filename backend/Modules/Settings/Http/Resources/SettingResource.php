<?php

namespace Modules\Settings\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SettingResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'          => $this->id,
            'scope'       => $this->scope,
            'scope_id'    => $this->scope_id,
            'group'       => $this->group,
            'key'         => $this->key,
            'value'       => $this->value,
            'type'        => $this->type,
            'label'       => $this->label,
            'description' => $this->description,
            'options'     => $this->options,
            'is_public'   => (bool) $this->is_public,
            'is_system'   => (bool) $this->is_system,
            'updated_at'  => $this->updated_at?->toIso8601String(),
        ];
    }
}
