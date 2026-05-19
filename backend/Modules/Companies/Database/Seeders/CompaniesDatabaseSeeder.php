<?php

namespace Modules\Companies\Database\Seeders;

use Illuminate\Database\Seeder;

class CompaniesDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CompaniesSeeder::class,
        ]);
    }
}
