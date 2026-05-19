<?php

namespace Modules\Loans\Database\Seeders;

use Illuminate\Database\Seeder;

class LoansDatabaseSeeder extends Seeder
{
    public function run(): void { $this->call(LoansSeeder::class); }
}
