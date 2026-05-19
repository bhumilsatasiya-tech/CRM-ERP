<?php

namespace Modules\Products\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Products\Models\ProductCategory;
use Modules\Products\Models\ProductUnit;

class ProductsSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Company::all() as $company) {
            // 1) Default units — first pass without base_unit_id
            $unitMap = [];
            foreach ((array) config('products.default_units', []) as $u) {
                $unit = ProductUnit::firstOrCreate(
                    ['company_id' => $company->id, 'code' => $u['code']],
                    [
                        'name'              => $u['name'],
                        'symbol'            => $u['symbol'],
                        'type'              => $u['type'],
                        'is_base'           => $u['is_base'],
                        'conversion_factor' => $u['conversion_factor'],
                        'decimals_allowed'  => $u['decimals_allowed'],
                        'is_active'         => true,
                    ]
                );
                $unitMap[$u['code']] = $unit;
            }

            // 2) Link derived units to their base for each type
            foreach (['weight', 'volume', 'count', 'length'] as $type) {
                $base = collect($unitMap)->first(fn($u) => $u->type === $type && $u->is_base);
                if (! $base) continue;
                foreach ($unitMap as $code => $u) {
                    if ($u->type === $type && ! $u->is_base && $u->base_unit_id !== $base->id) {
                        $u->forceFill(['base_unit_id' => $base->id])->save();
                    }
                }
            }

            // 3) Default category
            foreach ((array) config('products.default_categories', []) as $c) {
                $cat = ProductCategory::firstOrCreate(
                    ['company_id' => $company->id, 'code' => $c['code']],
                    array_merge($c, ['is_active' => true])
                );
                if (! $cat->path) {
                    $cat->forceFill(['depth' => 0, 'path' => "/{$cat->id}/"])->save();
                }
            }
        }
    }
}
