<?php

namespace Modules\Loans\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Settings\Models\Sequence;

class LoansSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Company::all() as $company) {
            Sequence::firstOrCreate(
                ['company_id' => $company->id, 'doc_type' => 'loan'],
                ['name' => 'Loan', 'prefix' => 'LOAN', 'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly', 'is_active' => true, 'current_number' => 0]
            );
        }
    }
}
