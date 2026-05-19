<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tax_invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);
            $table->unsignedBigInteger('export_invoice_id');
            $table->unsignedBigInteger('partner_id');

            $table->date('invoice_date');
            $table->string('reference', 128)->nullable();

            $table->string('currency', 8)->default('USD');
            $table->decimal('exchange_rate', 18, 6);

            // Customs exchange-rate notification (per CBIC monthly notification or RBI)
            $table->string('customs_notification_no', 64)->nullable();
            $table->date('customs_notification_date')->nullable();

            // GST identifiers
            $table->string('gstin_supplier', 32)->nullable();
            $table->string('gstin_recipient', 32)->nullable();
            $table->string('place_of_supply', 64)->nullable();

            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->enum('tax_type', ['cgst_sgst', 'igst', 'none'])->default('igst');
            $table->decimal('discount', 18, 2)->default(0);
            $table->decimal('shipping', 18, 2)->default(0);
            $table->decimal('total', 18, 2)->default(0);

            // INR equivalents (computed = ccy * exchange_rate at posting)
            $table->decimal('subtotal_inr', 18, 2)->default(0);
            $table->decimal('total_inr', 18, 2)->default(0);

            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft')->index();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->string('cancellation_reason')->nullable();

            $table->text('terms_and_conditions')->nullable();
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('export_invoice_id')->references('id')->on('export_invoices')->onDelete('restrict');
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'tax_invoices_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
            $table->index('invoice_date');
        });
    }
    public function down(): void { Schema::dropIfExists('tax_invoices'); }
};
