<?php

namespace Modules\Crm\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Crm\Models\Partner;

class CrmDemoSeeder extends Seeder
{
    /**
     * Seeds a small set of demo partners for both companies so the UI
     * shows real data on first run. Idempotent — won't duplicate.
     */
    public function run(): void
    {
        $companyA = Company::where('code', 'COA')->first();
        $companyB = Company::where('code', 'COB')->first();

        $samples = [
            // For Company A (export)
            ['company' => $companyA, 'rows' => [
                ['code' => 'CL-001', 'name' => 'Acme Pharma USA',  'type' => 'client',       'segment' => 'b2b',    'tax_treatment' => 'overseas',   'currency' => 'USD', 'credit_limit' => 50000, 'credit_days' => 45],
                ['code' => 'CL-002', 'name' => 'Globex Chemicals', 'type' => 'client',       'segment' => 'b2b',    'tax_treatment' => 'overseas',   'currency' => 'EUR', 'credit_limit' => 30000, 'credit_days' => 30],
                ['code' => 'SP-001', 'name' => 'India Logistics',  'type' => 'supplier',     'segment' => 'b2b',    'tax_treatment' => 'registered', 'currency' => 'INR', 'gst_no' => '27ABCDE1234F1Z5'],
                ['code' => 'MF-001', 'name' => 'Premier API Mfg.', 'type' => 'manufacturer', 'segment' => 'b2b',    'tax_treatment' => 'registered', 'currency' => 'INR'],
            ]],
            // For Company B (supplying)
            ['company' => $companyB, 'rows' => [
                ['code' => 'CL-001', 'name' => 'Company A',         'type' => 'client',   'segment' => 'b2b', 'tax_treatment' => 'registered', 'currency' => 'INR'],
                ['code' => 'SP-001', 'name' => 'Local Raw Material','type' => 'supplier', 'segment' => 'b2b', 'tax_treatment' => 'registered', 'currency' => 'INR'],
                ['code' => 'SP-002', 'name' => 'Packaging Co.',     'type' => 'supplier', 'segment' => 'b2b', 'tax_treatment' => 'registered', 'currency' => 'INR'],
            ]],
        ];

        foreach ($samples as $set) {
            if (! $set['company']) continue;
            foreach ($set['rows'] as $r) {
                Partner::firstOrCreate(
                    ['company_id' => $set['company']->id, 'code' => $r['code']],
                    array_merge($r, [
                        'company_id' => $set['company']->id,
                        'is_active'  => true,
                    ])
                );
            }
        }
    }
}
