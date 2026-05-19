<?php

namespace Modules\Projects\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProjectCostEntryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'project_id'  => $this->project_id,
            'category'    => $this->category,
            'description' => $this->description,
            'qty'         => (float) $this->qty,
            'unit'        => $this->unit,
            'rate'        => (float) $this->rate,
            'amount'      => (float) $this->amount,
            'partner_id'  => $this->partner_id,
            'partner'     => $this->whenLoaded('partner', fn() => $this->partner ? [
                'id' => $this->partner->id, 'code' => $this->partner->code, 'name' => $this->partner->name,
            ] : null),
            'entry_date'  => $this->entry_date?->toDateString(),
            'is_planned'  => (bool) $this->is_planned,
            'notes'       => $this->notes,
            'created_at'  => $this->created_at?->toIso8601String(),
        ];
    }
}
