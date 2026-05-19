<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('irms')) {
            // Add new columns
            Schema::table('irms', function (Blueprint $table) {
                if (!Schema::hasColumn('irms', 'partner_id'))             $table->foreignId('partner_id')->nullable()->after('export_invoice_id')->constrained('partners')->nullOnDelete();
                if (!Schema::hasColumn('irms', 'purpose'))                $table->enum('purpose', ['advance', 'against_invoice'])->default('against_invoice')->after('partner_id');
                if (!Schema::hasColumn('irms', 'purchase_order_ref'))     $table->string('purchase_order_ref', 128)->nullable()->after('purpose');
                if (!Schema::hasColumn('irms', 'remitter_name'))          $table->string('remitter_name', 255)->nullable()->after('bank_name');
                if (!Schema::hasColumn('irms', 'bank_ref_no'))            $table->string('bank_ref_no', 128)->nullable()->after('remitter_name');
                if (!Schema::hasColumn('irms', 'outstanding_amount_fcy')) $table->decimal('outstanding_amount_fcy', 18, 2)->default(0)->after('irm_amount_fcy');
                if (!Schema::hasColumn('irms', 'outstanding_amount_inr')) $table->decimal('outstanding_amount_inr', 18, 2)->default(0)->after('irm_amount_inr');
            });

            // Make export_invoice_id nullable for advance receipts
            // Drop FK first to drop NOT NULL safely
            DB::statement('ALTER TABLE irms MODIFY export_invoice_id BIGINT UNSIGNED NULL');

            // Extend status enum to include partially_allocated
            DB::statement("ALTER TABLE irms MODIFY status ENUM('received','partially_allocated','allocated','closed','cancelled') NOT NULL DEFAULT 'received'");

            // Backfill outstanding amounts and partner_id for existing IRMs
            $existing = DB::table('irms')->whereNull('deleted_at')->get();
            foreach ($existing as $r) {
                $allocatedFcy = (float) DB::table('irm_allocations')->where('irm_id', $r->id)->sum('amount_fcy');
                $allocatedInr = (float) DB::table('irm_allocations')->where('irm_id', $r->id)->sum('amount_inr');
                $partnerId = null;
                if ($r->export_invoice_id) {
                    $partnerId = DB::table('export_invoices')->where('id', $r->export_invoice_id)->value('partner_id');
                }
                DB::table('irms')->where('id', $r->id)->update([
                    'outstanding_amount_fcy' => max(0, (float) $r->irm_amount_fcy - $allocatedFcy),
                    'outstanding_amount_inr' => max(0, (float) $r->irm_amount_inr - $allocatedInr),
                    'partner_id'             => $partnerId,
                    'purpose'                => $r->export_invoice_id ? 'against_invoice' : 'advance',
                ]);
            }
        }

        if (Schema::hasTable('irm_allocations')) {
            Schema::table('irm_allocations', function (Blueprint $table) {
                if (!Schema::hasColumn('irm_allocations', 'shipping_bill_id'))    $table->foreignId('shipping_bill_id')->nullable()->after('export_invoice_id')->constrained('shipping_bills')->nullOnDelete();
                if (!Schema::hasColumn('irm_allocations', 'allocation_date'))     $table->date('allocation_date')->nullable()->after('amount_inr');
                if (!Schema::hasColumn('irm_allocations', 'exchange_rate'))       $table->decimal('exchange_rate', 18, 6)->default(1)->after('allocation_date');
                if (!Schema::hasColumn('irm_allocations', 'is_full_realization')) $table->boolean('is_full_realization')->default(false)->after('exchange_rate');
                if (!Schema::hasColumn('irm_allocations', 'created_by'))          $table->foreignId('created_by')->nullable()->after('is_full_realization');
            });
            // Backfill allocation_date for legacy rows
            DB::statement("UPDATE irm_allocations a JOIN irms i ON a.irm_id = i.id SET a.allocation_date = i.irm_date WHERE a.allocation_date IS NULL");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('irm_allocations')) {
            Schema::table('irm_allocations', function (Blueprint $table) {
                foreach (['shipping_bill_id'] as $col) if (Schema::hasColumn('irm_allocations', $col)) { $table->dropForeign([$col]); $table->dropColumn($col); }
                foreach (['allocation_date','exchange_rate','is_full_realization','created_by'] as $col) if (Schema::hasColumn('irm_allocations', $col)) $table->dropColumn($col);
            });
        }
        if (Schema::hasTable('irms')) {
            Schema::table('irms', function (Blueprint $table) {
                foreach (['partner_id'] as $col) if (Schema::hasColumn('irms', $col)) { $table->dropForeign([$col]); $table->dropColumn($col); }
                foreach (['purpose','purchase_order_ref','remitter_name','bank_ref_no','outstanding_amount_fcy','outstanding_amount_inr'] as $col) if (Schema::hasColumn('irms', $col)) $table->dropColumn($col);
            });
            DB::statement("ALTER TABLE irms MODIFY status ENUM('received','allocated','closed','cancelled') NOT NULL DEFAULT 'received'");
        }
    }
};
