<?php

namespace Modules\Finance\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AccountResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'         => $this->id,
            'company_id' => $this->company_id,
            'code'       => $this->code,
            'name'       => $this->name,
            'type'       => $this->type,
            'parent_id'  => $this->parent_id,
            'is_group'   => (bool) $this->is_group,
            'is_system'  => (bool) $this->is_system,
            'notes'      => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
