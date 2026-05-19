<?php

namespace Modules\Settings\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'           => $this->id,
            'log_name'     => $this->log_name,
            'description'  => $this->description,
            'event'        => $this->event,
            'subject_type' => $this->subject_type,
            'subject_id'   => $this->subject_id,
            'causer_type'  => $this->causer_type,
            'causer_id'    => $this->causer_id,
            'causer'       => $this->whenLoaded('causer', fn() => [
                'id'    => $this->causer?->id,
                'name'  => $this->causer?->name,
                'email' => $this->causer?->email,
            ]),
            'properties'   => $this->properties,
            'batch_uuid'   => $this->batch_uuid,
            'created_at'   => $this->created_at?->toIso8601String(),
        ];
    }
}
