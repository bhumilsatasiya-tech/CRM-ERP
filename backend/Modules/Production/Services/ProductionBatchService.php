<?php

namespace Modules\Production\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Inventory\Models\StockLedger;
use Modules\Inventory\Services\StockService;
use Modules\Production\Events\ProductionBatchCompleted;
use Modules\Production\Models\ProductionBatch;
use Modules\Production\Models\ProductionBatchInput;
use Modules\Production\Models\ProductionBatchOutput;
use Modules\Production\Models\ProductionQualityCheck;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class ProductionBatchService
{
    public function __construct(
        private StockService $stock,
        private SequenceService $sequences,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return ProductionBatch::query()
            ->with([
                'targetProduct:id,code,name',
                'rawWarehouse:id,code,name',
                'finishedWarehouse:id,code,name',
            ])
            ->withCount(['inputs', 'outputs'])
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['target_product_id'] ?? null), fn(Builder $q, $v) => $q->where('target_product_id', $v))
            ->when(($filters['sales_order_id'] ?? null), fn(Builder $q, $v) => $q->where('sales_order_id', $v))
            ->orderByDesc('planned_start_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $inputs, array $outputs, ?int $actorId = null): ProductionBatch
    {
        $stage = $header['stage'] ?? ProductionBatch::STAGE_FINAL;

        // QC batches don't write stock — outputs/inputs are inherited from the parent batch and recorded for inspection only.
        // Trial + Final batches require both input and output lines.
        if ($stage !== ProductionBatch::STAGE_QC) {
            if (count($outputs) === 0) {
                throw new RuntimeException('A production batch must have at least one output line.');
            }
            if (count($inputs) === 0) {
                throw new RuntimeException('A production batch must have at least one input line.');
            }
        }

        return DB::transaction(function () use ($companyId, $header, $inputs, $outputs, $actorId, $stage) {
            $code = $this->sequences->next($companyId, 'batch', $header['code'] ?? null);
            $batch = ProductionBatch::create(array_merge($header, [
                'company_id'   => $companyId,
                'code'         => $code,
                'stage'        => $stage,
                'status'       => ProductionBatch::STATUS_DRAFT,
                'qty_produced' => 0,
                'qty_failed'   => 0,
                'material_cost'=> 0,
                'created_by'   => $actorId,
                'updated_by'   => $actorId,
            ]));
            $this->syncInputs($batch, $inputs);
            $this->syncOutputs($batch, $outputs);
            $this->recalcCosts($batch);
            return $batch->fresh($this->withRelations());
        });
    }

    public function update(ProductionBatch $batch, array $header, ?array $inputs, ?array $outputs, ?int $actorId = null): ProductionBatch
    {
        if (! $batch->isEditable()) throw new RuntimeException('Only draft batches can be edited.');

        return DB::transaction(function () use ($batch, $header, $inputs, $outputs, $actorId) {
            $batch->fill($header);
            $batch->updated_by = $actorId;
            $batch->save();
            if (is_array($inputs))  $this->syncInputs($batch, $inputs);
            if (is_array($outputs)) $this->syncOutputs($batch, $outputs);
            $this->recalcCosts($batch);
            return $batch->fresh($this->withRelations());
        });
    }

    public function delete(ProductionBatch $batch): void
    {
        if (! $batch->isEditable()) throw new RuntimeException('Only draft batches can be deleted.');
        DB::transaction(fn() => $batch->delete());
    }

    public function submit(ProductionBatch $batch, ?int $actorId = null): ProductionBatch
    {
        if ($batch->status !== ProductionBatch::STATUS_DRAFT) {
            throw new RuntimeException('Only draft batches can be submitted.');
        }
        $batch->forceFill([
            'status'       => ProductionBatch::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'updated_by'   => $actorId,
        ])->save();
        return $batch->fresh($this->withRelations());
    }

    public function approve(ProductionBatch $batch, ?int $actorId = null): ProductionBatch
    {
        if ($batch->status !== ProductionBatch::STATUS_SUBMITTED) {
            throw new RuntimeException('Only submitted batches can be approved.');
        }
        $batch->forceFill([
            'status'      => ProductionBatch::STATUS_APPROVED,
            'approved_at' => now(),
            'updated_by'  => $actorId,
        ])->save();
        return $batch->fresh($this->withRelations());
    }

    public function start(ProductionBatch $batch, ?int $actorId = null): ProductionBatch
    {
        if ($batch->status !== ProductionBatch::STATUS_APPROVED) {
            throw new RuntimeException('Only approved batches can be started.');
        }
        $batch->forceFill([
            'status'            => ProductionBatch::STATUS_IN_PROGRESS,
            'started_at'        => now(),
            'actual_start_date' => $batch->actual_start_date ?? now(),
            'updated_by'        => $actorId,
        ])->save();
        return $batch->fresh($this->withRelations());
    }

    /**
     * Complete a batch: write OUT ledger rows for each input, IN rows for each non-scrap output.
     * The single ledger transaction is the heart of the module.
     *
     * $actuals shape:
     *   [
     *     'inputs'  => [['id' => 1, 'qty_consumed' => 10, 'rate' => 5, 'source_batch_no' => 'L1'], ...],
     *     'outputs' => [['id' => 1, 'qty_produced' => 5,  'rate' => 50, 'output_batch_no' => 'B001', 'expiry_date' => '2026-12-31'], ...],
     *     'actual_end_date' => '2026-05-03 14:00:00' (optional),
     *   ]
     */
    public function complete(ProductionBatch $batch, array $actuals, ?int $actorId = null): ProductionBatch
    {
        if (! in_array($batch->status, [ProductionBatch::STATUS_APPROVED, ProductionBatch::STATUS_IN_PROGRESS], true)) {
            throw new RuntimeException('Only approved or in-progress batches can be completed.');
        }

        return DB::transaction(function () use ($batch, $actuals, $actorId) {
            // QC stage: no stock movement; just record inspection results into meta.
            if ($batch->stage === ProductionBatch::STAGE_QC) {
                $batch->forceFill([
                    'status'         => ProductionBatch::STATUS_COMPLETED,
                    'completed_at'   => now(),
                    'actual_end_date'=> $actuals['actual_end_date'] ?? now(),
                    'meta'           => array_merge((array) $batch->meta, ['qc_results' => $actuals['qc_results'] ?? null]),
                    'updated_by'     => $actorId,
                ])->save();
                return $batch->fresh($this->withRelations());
            }

            $inputActuals  = collect($actuals['inputs']  ?? [])->keyBy('id');
            $outputActuals = collect($actuals['outputs'] ?? [])->keyBy('id');

            $totalMaterialCost = 0.0;

            // --- Inputs: stock OUT from raw_warehouse for each line ---
            foreach ($batch->inputs as $line) {
                $a   = $inputActuals->get($line->id, []);
                $qty = (float) ($a['qty_consumed'] ?? $line->qty_planned);
                if ($qty <= 0) {
                    throw new RuntimeException("Input line {$line->id}: qty_consumed must be positive.");
                }
                $rate     = (float) ($a['rate'] ?? $line->rate ?? 0);
                $batchNo  = $a['source_batch_no'] ?? $line->source_batch_no;

                $ledger = $this->stock->record([
                    'company_id'     => $batch->company_id,
                    'warehouse_id'   => $batch->raw_warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::OUT,
                    'qty'            => $qty,
                    'rate'           => $rate,
                    'reference_type' => ProductionBatch::class,
                    'reference_id'   => $batch->id,
                    'reference_no'   => $batch->code,
                    'batch_no'       => $batchNo,
                    'posted_at'      => now(),
                    'notes'          => "Production batch {$batch->code} (input)",
                    'created_by'     => $actorId,
                ]);

                $lineValue = round($qty * $rate, 2);
                $line->forceFill([
                    'qty_consumed'    => $qty,
                    'rate'            => $rate,
                    'line_value'      => $lineValue,
                    'source_batch_no' => $batchNo,
                    'ledger_id'       => $ledger->id,
                ])->save();
                $totalMaterialCost += $lineValue;
            }

            // --- Outputs: stock IN to finished_warehouse for finished/by_product ---
            // Trial stage: skip output ledger writes entirely (it's R&D — outputs aren't booked into finished inventory).
            // Scrap lines: still ledger them as IN (they may be sold/disposed later) — caller can change finished_warehouse if scrap goes elsewhere.
            $finishedQty = 0.0;
            $scrapQty    = 0.0;
            $isTrial = $batch->stage === ProductionBatch::STAGE_TRIAL;
            $finishedOutputs = $batch->outputs->where('output_type', '!=', ProductionBatchOutput::TYPE_SCRAP);
            $finishedPlannedTotal = (float) $finishedOutputs->sum('qty_planned');
            $allocatedCost = 0.0;
            $lastFinishedIdx = $finishedOutputs->keys()->last();

            foreach ($batch->outputs as $idx => $line) {
                $a   = $outputActuals->get($line->id, []);
                $qty = (float) ($a['qty_produced'] ?? $line->qty_planned);
                if ($qty <= 0) {
                    // skip lines with zero produced
                    $line->forceFill(['qty_produced' => 0])->save();
                    continue;
                }

                $batchNo    = $a['output_batch_no'] ?? $line->output_batch_no ?? $batch->output_batch_no;
                $expiryDate = $a['expiry_date']     ?? optional($line->expiry_date)->toDateString() ?? optional($batch->output_expiry_date)->toDateString();

                // Cost allocation: finished + by_product split material_cost in proportion to planned qty.
                // Scrap rows get rate 0 unless caller passed an explicit rate.
                if ($line->output_type === ProductionBatchOutput::TYPE_SCRAP) {
                    $rate = (float) ($a['rate'] ?? $line->rate ?? 0);
                } else {
                    if (array_key_exists('rate', $a)) {
                        $rate = (float) $a['rate'];
                    } elseif ($finishedPlannedTotal > 0) {
                        // Allocate cost proportionally; round-correct the last finished line
                        if ($idx === $lastFinishedIdx) {
                            $remainingCost = max(0.0, round($totalMaterialCost - $allocatedCost, 2));
                            $rate = $qty > 0 ? round($remainingCost / $qty, 4) : 0.0;
                        } else {
                            $shareCost = round($totalMaterialCost * ((float)$line->qty_planned / $finishedPlannedTotal), 2);
                            $rate = $qty > 0 ? round($shareCost / $qty, 4) : 0.0;
                            $allocatedCost += $shareCost;
                        }
                    } else {
                        $rate = (float) ($line->rate ?? 0);
                    }
                }

                $ledger = $isTrial ? null : $this->stock->record([
                    'company_id'     => $batch->company_id,
                    'warehouse_id'   => $batch->finished_warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::IN,
                    'qty'            => $qty,
                    'rate'           => $rate,
                    'reference_type' => ProductionBatch::class,
                    'reference_id'   => $batch->id,
                    'reference_no'   => $batch->code,
                    'batch_no'       => $batchNo,
                    'expiry_date'    => $expiryDate,
                    'posted_at'      => now(),
                    'notes'          => "Production batch {$batch->code} ({$line->output_type})",
                    'created_by'     => $actorId,
                ]);

                $line->forceFill([
                    'qty_produced'    => $qty,
                    'rate'            => $rate,
                    'line_value'      => round($qty * $rate, 2),
                    'output_batch_no' => $batchNo,
                    'expiry_date'     => $expiryDate,
                    'ledger_id'       => $ledger?->id,
                ])->save();

                if ($line->output_type === ProductionBatchOutput::TYPE_SCRAP) {
                    $scrapQty += $qty;
                } else {
                    $finishedQty += $qty;
                }
            }

            $batch->forceFill([
                'status'         => ProductionBatch::STATUS_COMPLETED,
                'completed_at'   => now(),
                'actual_end_date'=> $actuals['actual_end_date'] ?? now(),
                'qty_produced'   => $finishedQty,
                'qty_failed'     => $scrapQty,
                'material_cost'  => round($totalMaterialCost, 2),
                'updated_by'     => $actorId,
            ])->save();

            $fresh = $batch->fresh($this->withRelations());
            event(new ProductionBatchCompleted($fresh));
            return $fresh;
        });
    }

    public function cancel(ProductionBatch $batch, ?string $reason = null, ?int $actorId = null): ProductionBatch
    {
        if ($batch->status === ProductionBatch::STATUS_CANCELLED) {
            throw new RuntimeException('Batch is already cancelled.');
        }

        return DB::transaction(function () use ($batch, $reason, $actorId) {
            // If batch was completed, reverse all ledger rows we wrote.
            if ($batch->status === ProductionBatch::STATUS_COMPLETED) {
                foreach ($batch->inputs as $line) {
                    if ($line->ledger_id) {
                        $this->stock->reverse($line->ledger_id, "Cancelled production batch {$batch->code}", $actorId);
                    }
                }
                foreach ($batch->outputs as $line) {
                    if ($line->ledger_id) {
                        $this->stock->reverse($line->ledger_id, "Cancelled production batch {$batch->code}", $actorId);
                    }
                }
            }

            $batch->forceFill([
                'status'              => ProductionBatch::STATUS_CANCELLED,
                'cancelled_at'        => now(),
                'cancelled_by'        => $actorId,
                'cancellation_reason' => $reason,
                'updated_by'          => $actorId,
            ])->save();

            return $batch->fresh($this->withRelations());
        });
    }

    public function recordQualityCheck(ProductionBatch $batch, array $data, ?int $actorId = null): ProductionQualityCheck
    {
        return ProductionQualityCheck::create([
            'batch_id'   => $batch->id,
            'checked_by' => $actorId,
            'checked_at' => $data['checked_at'] ?? now(),
            'result'     => $data['result'],
            'parameter'  => $data['parameter']  ?? null,
            'expected'   => $data['expected']   ?? null,
            'observed'   => $data['observed']   ?? null,
            'notes'      => $data['notes']      ?? null,
        ]);
    }

    public function deleteQualityCheck(ProductionQualityCheck $qc): void
    {
        $qc->delete();
    }

    private function syncInputs(ProductionBatch $batch, array $rows): void
    {
        $batch->inputs()->delete();
        foreach ($rows as $r) {
            $qty  = (float) $r['qty_planned'];
            $rate = (float) ($r['rate'] ?? 0);
            ProductionBatchInput::create([
                'batch_id'         => $batch->id,
                'product_id'       => $r['product_id'],
                'qty_planned'      => $qty,
                'qty_consumed'     => 0,
                'rate'             => $rate,
                'line_value'       => round($qty * $rate, 2),
                'source_batch_no'  => $r['source_batch_no'] ?? null,
                'notes'            => $r['notes'] ?? null,
            ]);
        }
    }

    private function syncOutputs(ProductionBatch $batch, array $rows): void
    {
        $batch->outputs()->delete();
        foreach ($rows as $r) {
            $qty  = (float) $r['qty_planned'];
            $rate = (float) ($r['rate'] ?? 0);
            ProductionBatchOutput::create([
                'batch_id'        => $batch->id,
                'product_id'      => $r['product_id'],
                'output_type'     => $r['output_type'] ?? ProductionBatchOutput::TYPE_FINISHED,
                'qty_planned'     => $qty,
                'qty_produced'    => 0,
                'rate'            => $rate,
                'line_value'      => round($qty * $rate, 2),
                'output_batch_no' => $r['output_batch_no'] ?? null,
                'expiry_date'     => $r['expiry_date'] ?? null,
                'notes'           => $r['notes'] ?? null,
            ]);
        }
    }

    private function recalcCosts(ProductionBatch $batch): void
    {
        // Pre-completion estimate from planned qty * rate
        $estimated = (float) $batch->inputs()->sum(DB::raw('qty_planned * rate'));
        $batch->forceFill(['material_cost' => round($estimated, 2)])->save();
    }

    private function withRelations(): array
    {
        return [
            'inputs.product',
            'outputs.product',
            'qualityChecks',
            'targetProduct',
            'rawWarehouse',
            'finishedWarehouse',
            'salesOrder',
        ];
    }
}
