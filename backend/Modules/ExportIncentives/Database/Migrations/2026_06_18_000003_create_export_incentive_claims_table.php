<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('export_incentive_claims', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');

            // 'drawback' = Customs duty drawback; 'igst_refund' = IGST refund on exports; 'rodtep' = Remission of Duties and Taxes on Exported Products.
            $table->enum('type', ['drawback', 'igst_refund', 'rodtep'])->index();

            $table->unsignedBigInteger('shipping_bill_id')->nullable();
            $table->unsignedBigInteger('export_invoice_id')->nullable();

            $table->string('claim_no', 64)->nullable();   // Govt-provided ID (e.g. ICEGATE token); we don't auto-generate
            $table->date('claim_date');
            $table->decimal('claim_amount', 18, 2);
            $table->string('claim_currency', 8)->default('INR');

            // Workflow: pending (filed locally) → filed (with govt) → approved → credited (money in bank) → rejected
            $table->enum('status', ['pending', 'filed', 'approved', 'credited', 'rejected'])->default('pending')->index();

            $table->decimal('credited_amount', 18, 2)->nullable();
            $table->date('credited_date')->nullable();
            $table->string('bank_ref', 128)->nullable();

            $table->string('rejection_reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('shipping_bill_id')->references('id')->on('shipping_bills')->onDelete('set null');
            $table->foreign('export_invoice_id')->references('id')->on('export_invoices')->onDelete('set null');

            $table->index(['company_id', 'type', 'status', 'deleted_at']);
            $table->index('claim_date');
        });
    }

    public function down(): void { Schema::dropIfExists('export_incentive_claims'); }
};
