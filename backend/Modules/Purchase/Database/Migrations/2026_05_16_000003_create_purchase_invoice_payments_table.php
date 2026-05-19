<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mirror of invoice_payments but for purchase invoices (money paid TO suppliers).
 * Same shape, same audit pattern. Each row updates the parent PurchaseInvoice's
 * paid_amount / balance / status, identical to how InvoicePayment does it.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('purchase_invoice_id');
            $table->unsignedBigInteger('partner_id');
            $table->date('payment_date');
            $table->decimal('amount', 18, 2);
            $table->string('mode', 32)->default('bank');           // bank/cash/cheque/upi/card
            $table->string('reference', 128)->nullable();
            $table->string('currency', 8)->default('INR');
            $table->decimal('exchange_rate', 18, 6)->default(1);
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('purchase_invoice_id')->references('id')->on('purchase_invoices')->onDelete('cascade');
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('restrict');
            $table->index(['company_id', 'purchase_invoice_id']);
            $table->index('payment_date');
        });
    }

    public function down(): void { Schema::dropIfExists('purchase_invoice_payments'); }
};
