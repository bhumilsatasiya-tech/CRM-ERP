<?php

namespace Modules\Formula\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Formula\Models\Formula;
use Modules\Formula\Models\FormulaComponent;
use Modules\Products\Models\Product;
use RuntimeException;

class FormulaService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Formula::query()
            ->with(['targetProduct:id,code,name', 'outputUom:id,code,symbol'])
            ->withCount('components')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['target_product_id'] ?? null), fn(Builder $q, $v) => $q->where('target_product_id', (int) $v))
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $components, ?int $actorId = null): Formula
    {
        if (count($components) === 0) {
            throw new RuntimeException('A formula must have at least one component.');
        }
        return DB::transaction(function () use ($companyId, $header, $components, $actorId) {
            // Auto-version: if a formula already exists for this product, increment max version + 1.
            $version = (int) Formula::where('company_id', $companyId)
                ->where('target_product_id', $header['target_product_id'])
                ->max('version');
            $version = $version > 0 ? $version + 1 : 1;

            $code = $header['code'] ?? sprintf('FORM/%d/V%d', $header['target_product_id'], $version);

            $formula = Formula::create(array_merge($header, [
                'company_id' => $companyId,
                'code'       => $code,
                'version'    => $version,
                'is_active'  => false,
                'status'     => Formula::STATUS_DRAFT,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));
            $this->syncComponents($formula, $components);
            return $formula->fresh(['components.product', 'targetProduct', 'outputUom']);
        });
    }

    public function update(Formula $f, array $header, ?array $components, ?int $actorId = null): Formula
    {
        if (! $f->isEditable()) throw new RuntimeException('Only draft formulas can be edited.');
        return DB::transaction(function () use ($f, $header, $components, $actorId) {
            $f->fill($header);
            $f->updated_by = $actorId;
            $f->save();
            if (is_array($components)) $this->syncComponents($f, $components);
            return $f->fresh(['components.product', 'targetProduct', 'outputUom']);
        });
    }

    public function delete(Formula $f): void
    {
        if (! $f->isEditable()) throw new RuntimeException('Only draft formulas can be deleted.');
        DB::transaction(fn() => $f->delete());
    }

    public function activate(Formula $f, ?int $actorId = null): Formula
    {
        if ($f->status === Formula::STATUS_ACTIVE && $f->is_active) return $f;
        return DB::transaction(function () use ($f, $actorId) {
            // Deactivate every other version of the same target product.
            Formula::where('company_id', $f->company_id)
                ->where('target_product_id', $f->target_product_id)
                ->where('id', '!=', $f->id)
                ->update(['is_active' => false, 'status' => Formula::STATUS_INACTIVE]);

            $f->forceFill([
                'is_active' => true,
                'status'    => Formula::STATUS_ACTIVE,
                'updated_by'=> $actorId,
            ])->save();
            return $f->fresh(['components.product', 'targetProduct', 'outputUom']);
        });
    }

    /**
     * Find the active formula for a target product.
     */
    public function activeFor(int $companyId, int $targetProductId): ?Formula
    {
        return Formula::query()
            ->where('company_id', $companyId)
            ->where('target_product_id', $targetProductId)
            ->where('is_active', true)
            ->where('status', Formula::STATUS_ACTIVE)
            ->with(['components.product:id,code,name,standard_cost,unit_id'])
            ->first();
    }

    /**
     * Scale a formula to a target output qty. Returns input lines with rate from
     * Product.standard_cost, scaled qty = component.qty * (target/output_qty) * (1 + wastage_pct/100).
     */
    public function scaleFor(Formula $f, float $targetQty): array
    {
        if ((float) $f->output_qty <= 0) {
            throw new RuntimeException('Formula output_qty must be positive.');
        }
        $factor = $targetQty / (float) $f->output_qty;
        $f->loadMissing('components.product:id,code,name,standard_cost');

        return $f->components->map(function (FormulaComponent $c) use ($factor) {
            $scaled = (float) $c->qty * $factor * (1 + ((float) $c->wastage_pct / 100));
            $rate   = (float) ($c->product->standard_cost ?? 0);
            return [
                'product_id'      => $c->product_id,
                'product_code'    => $c->product?->code,
                'product_name'    => $c->product?->name,
                'qty_planned'     => round($scaled, 4),
                'rate'            => $rate,
                'line_value'      => round($scaled * $rate, 2),
                'source_batch_no' => null,
                'notes'           => $c->notes,
            ];
        })->all();
    }

    private function syncComponents(Formula $f, array $rows): void
    {
        $f->components()->delete();
        foreach ($rows as $r) {
            FormulaComponent::create([
                'formula_id'  => $f->id,
                'product_id'  => $r['product_id'],
                'uom_id'      => $r['uom_id'] ?? null,
                'qty'         => (float) $r['qty'],
                'wastage_pct' => (float) ($r['wastage_pct'] ?? 0),
                'notes'       => $r['notes'] ?? null,
            ]);
        }
    }
}
