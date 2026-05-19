<?php

namespace Modules\Documents\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id,
            'attachable_type' => $this->attachable_type,
            'attachable_id'   => $this->attachable_id,
            'category'        => $this->category,
            'original_filename' => $this->original_filename,
            'disk'            => $this->disk,
            'path'            => $this->path,
            'mime_type'       => $this->mime_type,
            'size_bytes'      => (int) $this->size_bytes,
            'notes'           => $this->notes,
            'uploaded_by'     => $this->uploaded_by,
            'created_at'      => $this->created_at?->toIso8601String(),
        ];
    }
}
