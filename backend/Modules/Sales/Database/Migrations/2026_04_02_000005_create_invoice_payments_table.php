<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('invoice_id');
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
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('restrict');
            $table->index(['company_id', 'invoice_id']);
            $table->index('payment_date');
        });
    }

    public function down(): void { Schema::dropIfExists('invoice_payments'); }
};
