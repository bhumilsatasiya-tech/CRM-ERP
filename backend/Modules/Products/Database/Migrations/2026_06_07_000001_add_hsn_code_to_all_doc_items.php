<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private array $tables = [
        'quotation_items',
        'sales_order_items',
        'invoice_items',
        'purchase_order_items',
        'grn_items',
        'purchase_invoice_items',
        'export_invoice_items',
        'shipping_bill_items',
        'packing_list_items',
        'inter_company_invoice_items',
    ];

    public function up(): void
    {
        foreach ($this->tables as $t) {
            if (!Schema::hasTable($t)) continue;
            if (Schema::hasColumn($t, 'hsn_code')) continue;
            Schema::table($t, function (Blueprint $table) {
                $table->string('hsn_code', 16)->nullable()->after('product_id');
                $table->index('hsn_code');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $t) {
            if (!Schema::hasTable($t)) continue;
            if (!Schema::hasColumn($t, 'hsn_code')) continue;
            Schema::table($t, function (Blueprint $table) {
                $table->dropIndex([$table->getTable() . '_hsn_code_index']);
                $table->dropColumn('hsn_code');
            });
        }
    }
};
