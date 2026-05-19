<?php

namespace Modules\Production\Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Production module seeder.
 *
 * Currently a no-op — the 'batch' sequence (prefix BT) is already seeded for
 * every company by SettingsDatabaseSeeder, and the module ships no static
 * demo data. This file exists so the seeder pattern is consistent across
 * modules and so future demo-data steps can be appended idempotently.
 */
class ProductionDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // intentionally empty
    }
}
