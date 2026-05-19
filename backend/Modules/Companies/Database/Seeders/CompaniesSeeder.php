<?php

namespace Modules\Companies\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Auth\Models\User;
use Modules\Companies\Models\Branch;
use Modules\Companies\Models\Company;
use Modules\Companies\Models\Warehouse;

class CompaniesSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = config('companies.seed', []);

        $companyA = Company::firstOrCreate(
            ['code' => $defaults['company_a']['code'] ?? 'COA'],
            $defaults['company_a'] ?? ['name' => 'Company A', 'type' => 'export']
        );

        $companyB = Company::firstOrCreate(
            ['code' => $defaults['company_b']['code'] ?? 'COB'],
            $defaults['company_b'] ?? ['name' => 'Company B', 'type' => 'supplying']
        );

        // Default head office branches
        Branch::firstOrCreate(
            ['company_id' => $companyA->id, 'code' => 'HO'],
            ['name' => 'Head Office', 'is_head_office' => true, 'is_active' => true]
        );
        Branch::firstOrCreate(
            ['company_id' => $companyB->id, 'code' => 'HO'],
            ['name' => 'Head Office', 'is_head_office' => true, 'is_active' => true]
        );

        // Default warehouses
        $aFinished = Warehouse::firstOrCreate(
            ['company_id' => $companyA->id, 'code' => 'WH-FG'],
            ['name' => 'Finished Goods', 'type' => 'finished', 'is_active' => true, 'is_default' => true]
        );
        Warehouse::firstOrCreate(
            ['company_id' => $companyA->id, 'code' => 'WH-RM'],
            ['name' => 'Raw Material', 'type' => 'raw', 'is_active' => true]
        );
        Warehouse::firstOrCreate(
            ['company_id' => $companyB->id, 'code' => 'WH-FG'],
            ['name' => 'Finished Goods', 'type' => 'finished', 'is_active' => true, 'is_default' => true]
        );
        Warehouse::firstOrCreate(
            ['company_id' => $companyB->id, 'code' => 'WH-RM'],
            ['name' => 'Raw Material', 'type' => 'raw', 'is_active' => true]
        );

        // Attach the seeded super-admin to both companies + set Company A as default
        $admin = User::where('email', env('ADMIN_SEED_EMAIL', 'admin@crm-erp.local'))->first();
        if ($admin) {
            $admin->companies()->syncWithoutDetaching([
                $companyA->id => ['is_default' => true,  'position' => 'Super Admin'],
                $companyB->id => ['is_default' => false, 'position' => 'Super Admin'],
            ]);
            if (! $admin->default_company_id) {
                $admin->forceFill(['default_company_id' => $companyA->id])->save();
            }
        }
    }
}
