<?php

namespace Modules\Templates\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DocumentTemplateResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'doc_type'   => $this->doc_type,
            'name'       => $this->name,
            'html'       => $this->html,
            'css'        => $this->css,
            'paper_size' => $this->paper_size,
            'orientation'=> $this->orientation,
            'is_default' => (bool) $this->is_default,
            'is_active'  => (bool) $this->is_active,
            'notes'      => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
