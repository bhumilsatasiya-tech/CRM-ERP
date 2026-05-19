<?php

namespace Modules\Hr\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Hr\Models\SalaryComponent;
use Modules\Settings\Models\Sequence;

class HrSeeder extends Seeder
{
    public function run(): void
    {
        $components = [
            ['code' => 'HRA',  'name' => 'House Rent Allowance', 'type' => 'earning',   'is_taxable' => true,  'formula_type' => 'percent_of_basic', 'formula_value' => 40],
            ['code' => 'DA',   'name' => 'Dearness Allowance',   'type' => 'earning',   'is_taxable' => true,  'formula_type' => 'percent_of_basic', 'formula_value' => 10],
            ['code' => 'PF',   'name' => 'Provident Fund',       'type' => 'deduction', 'is_taxable' => false, 'formula_type' => 'percent_of_basic', 'formula_value' => 12],
            ['code' => 'ESI',  'name' => 'Employee State Ins.',  'type' => 'deduction', 'is_taxable' => false, 'formula_type' => 'percent_of_basic', 'formula_value' => 0.75],
            ['code' => 'PT',   'name' => 'Professional Tax',     'type' => 'deduction', 'is_taxable' => false, 'formula_type' => 'fixed',            'formula_value' => 200],
        ];

        foreach (Company::all() as $company) {
            // Sequences
            foreach ([
                ['doc_type' => 'employee',   'name' => 'Employee',   'prefix' => 'EMP'],
                ['doc_type' => 'salary_run', 'name' => 'Salary Run', 'prefix' => 'PAY'],
            ] as $tpl) {
                Sequence::firstOrCreate(
                    ['company_id' => $company->id, 'doc_type' => $tpl['doc_type']],
                    array_merge($tpl, ['format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly', 'is_active' => true, 'current_number' => 0])
                );
            }
            // Default components
            foreach ($components as $c) {
                SalaryComponent::firstOrCreate(
                    ['company_id' => $company->id, 'code' => $c['code']],
                    array_merge($c, ['is_active' => true])
                );
            }
        }
    }
}
