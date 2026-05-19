<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE partners MODIFY COLUMN type ENUM('client', 'supplier', 'vendor', 'manufacturer', 'importer', 'employee', 'other') NOT NULL DEFAULT 'client'");
    }

    public function down(): void
    {
        // First map any new types back to existing values so the down-migration succeeds
        DB::statement("UPDATE partners SET type = 'supplier' WHERE type = 'vendor'");
        DB::statement("UPDATE partners SET type = 'client' WHERE type = 'importer'");
        DB::statement("ALTER TABLE partners MODIFY COLUMN type ENUM('client', 'supplier', 'manufacturer', 'employee', 'other') NOT NULL DEFAULT 'client'");
    }
};
