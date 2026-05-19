<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds `tax_type` enum to every transaction document so the UI can render Indian
 * GST breakdowns: CGST+SGST (intra-state), IGST (inter-state / export with tax),
 * or none (LUT export / out-of-scope).
 *
 * The total tax_amount is unchanged on each line — the breakdown is derived
 * server-side in Resources and rendered client-side in the line editor.
 *
 * Defaults:
 *  - Domestic docs (quotations, sales_orders, invoices, purchase_orders, purchase_invoices) → cgst_sgst
 *  - Export Invoice + Inter-Company → igst
 */
return new class extends Migration {
    private array $tables = [
        'quotations'              => 'cgst_sgst',
        'sales_orders'            => 'cgst_sgst',
        'invoices'                => 'cgst_sgst',
        'purchase_orders'         => 'cgst_sgst',
        'purchase_invoices'       => 'cgst_sgst',
        'export_invoices'         => 'igst',
        'inter_company_invoices'  => 'igst',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table => $default) {
            if (Schema::hasColumn($table, 'tax_type')) continue;
            Schema::table($table, function (Blueprint $t) use ($default) {
                $t->enum('tax_type', ['cgst_sgst', 'igst', 'none'])->default($default)->after('tax_amount');
            });
        }
    }

    public function down(): void
    {
        foreach (array_keys($this->tables) as $table) {
            if (! Schema::hasColumn($table, 'tax_type')) continue;
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('tax_type');
            });
        }
    }
};
