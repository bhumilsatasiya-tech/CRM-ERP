<?php

namespace Modules\Formula\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class FormulaResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'         => $this->id,
            'company_id' => $this->company_id,
            'code'       => $this->code,
            'version'    => (int) $this->version,
            'is_active'  => (bool) $this->is_active,
            'status'     => $this->status,

            'target_product_id' => $this->target_product_id,
            'target_product'    => $this->whenLoaded('targetProduct', fn() => $this->targetProduct ? [
                'id' => $this->targetProduct->id, 'code' => $this->targetProduct->code, 'name' => $this->targetProduct->name,
            ] : null),

            'output_qty'    => (float) $this->output_qty,
            'output_uom_id' => $this->output_uom_id,
            'output_uom'    => $this->whenLoaded('outputUom', fn() => $this->outputUom ? [
                'id' => $this->outputUom->id, 'code' => $this->outputUom->code, 'symbol' => $this->outputUom->symbol,
            ] : null),

            'components' => $this->whenLoaded('components', fn() => $this->components->map(fn($c) => [
                'id'          => $c->id,
                'product_id'  => $c->product_id,
                'product'     => $c->product ? ['id' => $c->product->id, 'code' => $c->product->code, 'name' => $c->product->name] : null,
                'uom_id'      => $c->uom_id,
                'qty'         => (float) $c->qty,
                'wastage_pct' => (float) $c->wastage_pct,
                'notes'       => $c->notes,
            ])->values()),

            'components_count' => $this->whenCounted('components'),
            'notes'      => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
