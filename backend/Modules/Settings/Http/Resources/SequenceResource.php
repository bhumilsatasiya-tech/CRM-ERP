<?php

namespace Modules\Settings\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SequenceResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'             => $this->id,
            'company_id'     => $this->company_id,
            'doc_type'       => $this->doc_type,
            'name'           => $this->name,
            'prefix'         => $this->prefix,
            'suffix'         => $this->suffix,
            'current_number' => (int) $this->current_number,
            'padding'        => (int) $this->padding,
            'format'         => $this->format,
            'reset_period'   => $this->reset_period,
            'last_reset_at'  => $this->last_reset_at?->toDateString(),
            'is_active'      => (bool) $this->is_active,
            'next_preview'   => $this->when(isset($this->next_preview), fn() => $this->next_preview),
            'created_at'     => $this->created_at?->toIso8601String(),
            'updated_at'     => $this->updated_at?->toIso8601String(),
        ];
    }
}
