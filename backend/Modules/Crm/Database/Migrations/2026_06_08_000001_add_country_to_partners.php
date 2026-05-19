<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('partners')) return;
        if (Schema::hasColumn('partners', 'country')) return;
        Schema::table('partners', function (Blueprint $table) {
            // ISO 3166-1 alpha-2 country code. Defaults to IN for backfill.
            $table->char('country', 2)->default('IN')->after('mobile');
            $table->index('country');
        });

        // Backfill: any partner already flagged 'overseas' for tax treatment
        // is presumed to be non-IN. Default 'XX' so the user reviews manually.
        \Illuminate\Support\Facades\DB::table('partners')
            ->where('tax_treatment', 'overseas')
            ->update(['country' => 'XX']);
    }

    public function down(): void
    {
        if (!Schema::hasTable('partners')) return;
        if (!Schema::hasColumn('partners', 'country')) return;
        Schema::table('partners', function (Blueprint $table) {
            $table->dropIndex(['country']);
            $table->dropColumn('country');
        });
    }
};
