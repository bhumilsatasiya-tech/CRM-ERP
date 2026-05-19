<?php

namespace Modules\Products\Database\Seeders;

use Illuminate\Database\Seeder;

class ProductsDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProductsSeeder::class,
        ]);
    }
}
