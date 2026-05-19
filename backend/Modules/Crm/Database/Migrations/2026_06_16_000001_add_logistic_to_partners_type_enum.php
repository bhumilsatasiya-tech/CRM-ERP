<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('partners')) return;
        DB::statement("ALTER TABLE partners MODIFY type ENUM('client','supplier','vendor','manufacturer','importer','employee','logistic','other') NOT NULL DEFAULT 'client'");
    }

    public function down(): void
    {
        if (!Schema::hasTable('partners')) return;
        // Re-map any 'logistic' rows to 'supplier' before shrinking the enum
        DB::table('partners')->where('type', 'logistic')->update(['type' => 'supplier']);
        DB::statement("ALTER TABLE partners MODIFY type ENUM('client','supplier','vendor','manufacturer','importer','employee','other') NOT NULL DEFAULT 'client'");
    }
};
