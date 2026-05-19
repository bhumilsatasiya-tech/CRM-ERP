<?php

namespace Modules\Production\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductionQualityCheckResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'         => $this->id,
            'batch_id'   => $this->batch_id,
            'checked_by' => $this->checked_by,
            'checked_at' => $this->checked_at?->toIso8601String(),
            'result'     => $this->result,
            'parameter'  => $this->parameter,
            'expected'   => $this->expected,
            'observed'   => $this->observed,
            'notes'      => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
