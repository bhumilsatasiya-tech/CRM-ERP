<?php

namespace Modules\Production\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductionBatchResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'code' => $this->code,

            'stage'           => $this->stage,
            'parent_batch_id' => $this->parent_batch_id,

            'target_product_id' => $this->target_product_id,
            'target_product' => $this->whenLoaded('targetProduct', fn() => $this->targetProduct ? [
                'id' => $this->targetProduct->id, 'code' => $this->targetProduct->code, 'name' => $this->targetProduct->name,
            ] : null),

            'qty_planned'  => (float) $this->qty_planned,
            'qty_produced' => (float) $this->qty_produced,
            'qty_failed'   => (float) $this->qty_failed,

            'raw_warehouse_id' => $this->raw_warehouse_id,
            'raw_warehouse' => $this->whenLoaded('rawWarehouse', fn() => $this->rawWarehouse ? [
                'id' => $this->rawWarehouse->id, 'code' => $this->rawWarehouse->code, 'name' => $this->rawWarehouse->name,
            ] : null),

            'finished_warehouse_id' => $this->finished_warehouse_id,
            'finished_warehouse' => $this->whenLoaded('finishedWarehouse', fn() => $this->finishedWarehouse ? [
                'id' => $this->finishedWarehouse->id, 'code' => $this->finishedWarehouse->code, 'name' => $this->finishedWarehouse->name,
            ] : null),

            'sales_order_id' => $this->sales_order_id,
            'sales_order' => $this->whenLoaded('salesOrder', fn() => $this->salesOrder ? [
                'id' => $this->salesOrder->id, 'code' => $this->salesOrder->code,
            ] : null),

            'planned_start_date' => $this->planned_start_date?->toDateString(),
            'planned_end_date'   => $this->planned_end_date?->toDateString(),
            'actual_start_date'  => $this->actual_start_date?->toIso8601String(),
            'actual_end_date'    => $this->actual_end_date?->toIso8601String(),

            'output_batch_no'    => $this->output_batch_no,
            'output_expiry_date' => $this->output_expiry_date?->toDateString(),

            'material_cost' => (float) $this->material_cost,

            'status'       => $this->status,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'approved_at'  => $this->approved_at?->toIso8601String(),
            'started_at'   => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,

            'notes' => $this->notes,

            'inputs' => $this->whenLoaded('inputs', fn() => $this->inputs->map(fn($l) => [
                'id'              => $l->id,
                'product_id'      => $l->product_id,
                'product'         => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'qty_planned'     => (float) $l->qty_planned,
                'qty_consumed'    => (float) $l->qty_consumed,
                'rate'            => (float) $l->rate,
                'line_value'      => (float) $l->line_value,
                'source_batch_no' => $l->source_batch_no,
                'ledger_id'       => $l->ledger_id,
                'notes'           => $l->notes,
            ])->values()),

            'outputs' => $this->whenLoaded('outputs', fn() => $this->outputs->map(fn($l) => [
                'id'              => $l->id,
                'product_id'      => $l->product_id,
                'product'         => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                'output_type'     => $l->output_type,
                'qty_planned'     => (float) $l->qty_planned,
                'qty_produced'    => (float) $l->qty_produced,
                'rate'            => (float) $l->rate,
                'line_value'      => (float) $l->line_value,
                'output_batch_no' => $l->output_batch_no,
                'expiry_date'     => $l->expiry_date?->toDateString(),
                'ledger_id'       => $l->ledger_id,
                'notes'           => $l->notes,
            ])->values()),

            'quality_checks' => $this->whenLoaded('qualityChecks', fn() => $this->qualityChecks->map(fn($q) => [
                'id'         => $q->id,
                'checked_at' => $q->checked_at?->toIso8601String(),
                'checked_by' => $q->checked_by,
                'result'     => $q->result,
                'parameter'  => $q->parameter,
                'expected'   => $q->expected,
                'observed'   => $q->observed,
                'notes'      => $q->notes,
            ])->values()),

            'inputs_count'  => $this->whenCounted('inputs'),
            'outputs_count' => $this->whenCounted('outputs'),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
