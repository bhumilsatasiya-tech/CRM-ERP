<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Performance pass — composite indexes on hot tables.
 *
 * Hot reads identified:
 *   - StockService::getCurrentStock / currentStockPivot — filter by warehouse_id + product_id, order by posted_at desc
 *   - StockService::reverse — lookup by reference_type + reference_id
 *   - BalanceService trial-balance / ledger — group journal_lines by account_id
 *   - AutoJournalListener idempotency — find journal_entries by (reference_type, reference_id)
 *   - IRM outstanding calc — filter irm_allocations by (irm_id, utilization_status)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stock_ledger', function (Blueprint $table) {
            $table->index(['warehouse_id', 'product_id', 'posted_at'], 'stock_ledger_wh_prod_posted_idx');
            $table->index(['reference_type', 'reference_id'], 'stock_ledger_ref_idx');
        });

        if (Schema::hasTable('journal_lines')) {
            Schema::table('journal_lines', function (Blueprint $table) {
                $table->index(['account_id', 'journal_entry_id'], 'journal_lines_acct_je_idx');
            });
        }

        if (Schema::hasTable('journal_entries')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                $table->index(['reference_type', 'reference_id'], 'journal_entries_ref_idx');
            });
        }

        if (Schema::hasTable('irm_allocations')) {
            Schema::table('irm_allocations', function (Blueprint $table) {
                $table->index(['irm_id', 'utilization_status'], 'irm_allocations_irm_status_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::table('stock_ledger', function (Blueprint $table) {
            $table->dropIndex('stock_ledger_wh_prod_posted_idx');
            $table->dropIndex('stock_ledger_ref_idx');
        });
        if (Schema::hasTable('journal_lines')) {
            Schema::table('journal_lines', fn (Blueprint $t) => $t->dropIndex('journal_lines_acct_je_idx'));
        }
        if (Schema::hasTable('journal_entries')) {
            Schema::table('journal_entries', fn (Blueprint $t) => $t->dropIndex('journal_entries_ref_idx'));
        }
        if (Schema::hasTable('irm_allocations')) {
            Schema::table('irm_allocations', fn (Blueprint $t) => $t->dropIndex('irm_allocations_irm_status_idx'));
        }
    }
};
