<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('packing_lists', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);
            $table->unsignedBigInteger('export_invoice_id');

            $table->date('pl_date');
            $table->text('marks_and_numbers')->nullable();
            $table->unsignedInteger('total_packages')->default(0);
            $table->decimal('gross_weight_kg', 18, 3)->default(0);
            $table->decimal('net_weight_kg', 18, 3)->default(0);
            $table->decimal('volume_cbm', 18, 3)->default(0);

            $table->enum('status', ['draft', 'finalized', 'cancelled'])->default('draft')->index();
            $table->timestamp('finalized_at')->nullable();
            $table->unsignedBigInteger('finalized_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->string('cancellation_reason')->nullable();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('export_invoice_id')->references('id')->on('export_invoices')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'packing_lists_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('packing_lists'); }
};
