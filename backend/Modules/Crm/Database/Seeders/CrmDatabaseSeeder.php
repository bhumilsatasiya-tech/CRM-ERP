<?php

namespace Modules\Crm\Database\Seeders;

use Illuminate\Database\Seeder;

class CrmDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CrmDemoSeeder::class,
        ]);
    }
}
