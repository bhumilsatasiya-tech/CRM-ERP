<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('irm_allocations') && !Schema::hasColumn('irm_allocations', 'is_third_party_payment')) {
            Schema::table('irm_allocations', function (Blueprint $table) {
                $table->boolean('is_third_party_payment')->default(false)->after('is_full_realization');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('irm_allocations') && Schema::hasColumn('irm_allocations', 'is_third_party_payment')) {
            Schema::table('irm_allocations', function (Blueprint $table) {
                $table->dropColumn('is_third_party_payment');
            });
        }
    }
};
