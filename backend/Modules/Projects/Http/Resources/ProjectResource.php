<?php

namespace Modules\Projects\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id,
            'company_id'        => $this->company_id,
            'code'              => $this->code,
            'name'              => $this->name,
            'description'       => $this->description,
            'target_product_id' => $this->target_product_id,
            'target_product'    => $this->whenLoaded('targetProduct', fn() => [
                'id'   => $this->targetProduct->id,
                'code' => $this->targetProduct->code,
                'name' => $this->targetProduct->name,
            ]),
            'target_qty'    => (float) $this->target_qty,
            'unit'          => $this->unit,
            'status'        => $this->status,
            'start_date'    => $this->start_date?->toDateString(),
            'end_date'      => $this->end_date?->toDateString(),
            'planned_total' => (float) $this->planned_total,
            'actual_total'  => (float) $this->actual_total,
            'notes'         => $this->notes,
            'meta'          => $this->meta,
            'entries_count' => $this->whenCounted('entries'),
            'entries'       => ProjectCostEntryResource::collection($this->whenLoaded('entries')),
            'created_at'    => $this->created_at?->toIso8601String(),
            'updated_at'    => $this->updated_at?->toIso8601String(),
        ];
    }
}
