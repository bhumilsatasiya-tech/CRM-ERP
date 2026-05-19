<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('lodgements')) {
            Schema::create('lodgements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
                $table->string('code', 64);
                $table->foreignId('partner_id')->nullable()->constrained('partners')->nullOnDelete();
                $table->date('lodgement_date');
                $table->string('bank_receipt_no', 64)->nullable();
                $table->date('bank_receipt_date')->nullable();
                $table->enum('status', ['draft','submitted','accepted','rejected','cancelled'])->default('draft');
                $table->text('rejection_reason')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable();
                $table->foreignId('updated_by')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['company_id', 'status', 'deleted_at']);
                $table->unique(['company_id', 'code']);
                $table->index('bank_receipt_no');
            });
        }

        if (Schema::hasTable('irm_allocations')) {
            Schema::table('irm_allocations', function (Blueprint $table) {
                if (!Schema::hasColumn('irm_allocations', 'lodgement_id'))      $table->foreignId('lodgement_id')->nullable()->after('shipping_bill_id')->constrained('lodgements')->nullOnDelete();
                if (!Schema::hasColumn('irm_allocations', 'utilization_status')) $table->enum('utilization_status', ['pending','utilised','unutilised','rejected'])->default('utilised')->after('is_full_realization');
                if (!Schema::hasColumn('irm_allocations', 'utilization_note'))   $table->string('utilization_note', 255)->nullable()->after('utilization_status');
            });
        }

        // Backfill lodgement sequences for existing companies (idempotent).
        if (Schema::hasTable('sequences') && Schema::hasTable('companies')) {
            $now = now();
            foreach (\Illuminate\Support\Facades\DB::table('companies')->whereNull('deleted_at')->pluck('id') as $cid) {
                $exists = \Illuminate\Support\Facades\DB::table('sequences')->where('company_id', $cid)->where('doc_type', 'lodgement')->exists();
                if ($exists) continue;
                \Illuminate\Support\Facades\DB::table('sequences')->insert([
                    'company_id'     => $cid,
                    'doc_type'       => 'lodgement',
                    'name'           => 'Export Lodgement',
                    'prefix'         => 'LODGE',
                    'suffix'         => '',
                    'format'         => '{prefix}/{year}/{number}',
                    'padding'        => 5,
                    'current_number' => 0,
                    'reset_period'   => 'yearly',
                    'is_active'      => 1,
                    'created_at'     => $now,
                    'updated_at'     => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('irm_allocations')) {
            Schema::table('irm_allocations', function (Blueprint $table) {
                if (Schema::hasColumn('irm_allocations', 'lodgement_id')) {
                    $table->dropForeign(['lodgement_id']);
                    $table->dropColumn('lodgement_id');
                }
                foreach (['utilization_status','utilization_note'] as $col) {
                    if (Schema::hasColumn('irm_allocations', $col)) $table->dropColumn($col);
                }
            });
        }
        Schema::dropIfExists('lodgements');
    }
};
