<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Soft-delete-aware unique indexes.
 *
 * Today every doc table has a hard UNIQUE on (company_id, code) (or just code for `companies`).
 * That blocks reusing a code even after soft-delete — the deleted row sits in the table and
 * the index doesn't care about deleted_at.
 *
 * Fix: rebuild as UNIQUE(company_id, code, deleted_at). MySQL InnoDB treats NULL as DISTINCT
 * inside a unique index, so:
 *
 *   - Active row     (1, 'ACME001', NULL)             → present
 *   - Soft-deleted   (1, 'ACME001', '2026-05-01 ...') → present, doesn't conflict
 *   - New active     (1, 'ACME001', NULL)             → ALLOWED at DB level
 *
 * The third case (two active NULLs) IS technically allowed by InnoDB. Active-row uniqueness is
 * therefore enforced by the application layer — every Store*Request uses
 * `Rule::unique(table, code)->where(company_id, …)->whereNull('deleted_at')` which catches it.
 *
 * Net behaviour: delete a partner / product / invoice / batch / etc., its code becomes free
 * for reuse. The audit trail (the soft-deleted row) is preserved.
 *
 * `fiscal_periods` is excluded — it has no soft-delete column.
 */
return new class extends Migration {
    /** [table, columns excluding deleted_at, old index name (null = use cols)] */
    private array $targets = [
        // Foundation
        ['companies',                 ['code'],                      'companies_code_unique'],
        ['branches',                  ['company_id', 'code'],        null],
        ['warehouses',                ['company_id', 'code'],        null],

        // Master data
        ['partners',                  ['company_id', 'code'],        'partners_company_code_unique'],
        ['products',                  ['company_id', 'code'],        'products_company_code_unique'],
        ['product_categories',        ['company_id', 'code'],        'product_categories_company_code_unique'],
        ['product_units',             ['company_id', 'code'],        'product_units_company_code_unique'],
        ['formulas',                  ['company_id', 'code'],        'formulas_company_code_unique'],

        // Inventory
        ['stock_adjustments',         ['company_id', 'code'],        'stock_adjustments_company_code_unique'],
        ['stock_transfers',           ['company_id', 'code'],        'stock_transfers_company_code_unique'],

        // Purchase
        ['purchase_orders',           ['company_id', 'code'],        'po_company_code_unique'],
        ['grns',                      ['company_id', 'code'],        'grns_company_code_unique'],
        ['purchase_invoices',         ['company_id', 'code'],        'pi_company_code_unique'],

        // Sales
        ['quotations',                ['company_id', 'code'],        'quotations_company_code_unique'],
        ['sales_orders',              ['company_id', 'code'],        'so_company_code_unique'],
        ['invoices',                  ['company_id', 'code'],        'invoices_company_code_unique'],

        // Production
        ['production_batches',        ['company_id', 'code'],        'production_batches_company_code_unique'],

        // Export
        ['export_invoices',           ['company_id', 'code'],        'export_invoices_company_code_unique'],
        ['shipping_bills',            ['company_id', 'code'],        'shipping_bills_company_code_unique'],
        ['packing_lists',             ['company_id', 'code'],        'packing_lists_company_code_unique'],
        ['tax_invoices',              ['company_id', 'code'],        'tax_invoices_company_code_unique'],

        // IRM
        ['irms',                      ['company_id', 'code'],        'irms_company_code_unique'],
        ['lodgements',                ['company_id', 'code'],        null],

        // Inter-Company (uses from_company_id, not company_id)
        ['inter_company_invoices',    ['from_company_id', 'code'],   'ici_from_company_code_unique'],

        // Finance
        ['accounts',                  ['company_id', 'code'],        'accounts_company_code_unique'],
        ['journal_entries',           ['company_id', 'code'],        'journal_entries_company_code_unique'],

        // Loans
        ['loans',                     ['company_id', 'code'],        'loans_company_code_unique'],

        // HR
        ['designations',              ['company_id', 'code'],        'designations_company_code_unique'],
        ['employees',                 ['company_id', 'code'],        'employees_company_code_unique'],
        ['salary_components',         ['company_id', 'code'],        'salary_components_company_code_unique'],
        ['salary_runs',               ['company_id', 'code'],        'salary_runs_company_code_unique'],

        // Comms
        ['comm_templates',            ['company_id', 'code'],        'comm_templates_company_code_unique'],
    ];

    public function up(): void
    {
        foreach ($this->targets as [$table, $cols, $oldName]) {
            if (!Schema::hasTable($table)) continue;
            // Only proceed if deleted_at exists — otherwise NULL distinctness can't free up codes.
            if (!Schema::hasColumn($table, 'deleted_at')) continue;

            $newName = "{$table}_active_code_unique";

            // ADD the new soft-delete-aware unique FIRST (so the FK on the leftmost column
            // still has a covering index when we drop the old strict unique below).
            try {
                Schema::table($table, function (Blueprint $t) use ($cols, $newName) {
                    $t->unique(array_merge($cols, ['deleted_at']), $newName);
                });
            } catch (\Throwable $e) {
                // Already exists (rerun after partial failure) — ignore.
            }

            try {
                Schema::table($table, function (Blueprint $t) use ($cols, $oldName) {
                    if ($oldName) $t->dropUnique($oldName);
                    else $t->dropUnique($cols);
                });
            } catch (\Throwable $e) {
                // Index may not exist (fresh install / already dropped) — ignore.
            }
        }
    }

    public function down(): void
    {
        foreach ($this->targets as [$table, $cols, $oldName]) {
            if (!Schema::hasTable($table)) continue;
            if (!Schema::hasColumn($table, 'deleted_at')) continue;

            $newName = "{$table}_active_code_unique";

            Schema::table($table, function (Blueprint $t) use ($cols, $oldName, $newName) {
                try { $t->dropUnique($newName); } catch (\Throwable $e) {}
                if ($oldName) $t->unique($cols, $oldName);
                else         $t->unique($cols);
            });
        }
    }
};
