<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('product_units')) return;
        Schema::table('product_units', function (Blueprint $table) {
            if (!Schema::hasColumn('product_units', 'formal_name')) $table->string('formal_name', 128)->nullable()->after('name');
            if (!Schema::hasColumn('product_units', 'uqc'))         $table->string('uqc', 8)->nullable()->after('symbol')->comment('GST Unit Quantity Code, e.g. KGS, PCS, MTR');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('product_units')) return;
        Schema::table('product_units', function (Blueprint $table) {
            foreach (['formal_name', 'uqc'] as $col) {
                if (Schema::hasColumn('product_units', $col)) $table->dropColumn($col);
            }
        });
    }
};
