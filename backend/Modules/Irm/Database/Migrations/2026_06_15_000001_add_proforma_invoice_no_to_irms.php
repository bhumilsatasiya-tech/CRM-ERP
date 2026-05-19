<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('irms') && !Schema::hasColumn('irms', 'proforma_invoice_no')) {
            Schema::table('irms', function (Blueprint $table) {
                $table->string('proforma_invoice_no', 64)->nullable()->after('purchase_order_ref');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('irms') && Schema::hasColumn('irms', 'proforma_invoice_no')) {
            Schema::table('irms', function (Blueprint $table) {
                $table->dropColumn('proforma_invoice_no');
            });
        }
    }
};
