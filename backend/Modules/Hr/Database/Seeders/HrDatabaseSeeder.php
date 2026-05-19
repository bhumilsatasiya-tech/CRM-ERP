<?php

namespace Modules\Hr\Database\Seeders;

use Illuminate\Database\Seeder;

class HrDatabaseSeeder extends Seeder
{
    public function run(): void { $this->call(HrSeeder::class); }
}
