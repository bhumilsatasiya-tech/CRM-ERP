<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shipping_bill_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shipping_bill_id');
            $table->unsignedBigInteger('export_invoice_item_id')->nullable();
            $table->unsignedBigInteger('product_id');

            $table->decimal('qty', 18, 4);
            $table->string('batch_no', 64)->nullable();
            $table->date('expiry_date')->nullable();

            $table->unsignedBigInteger('ledger_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('shipping_bill_id')->references('id')->on('shipping_bills')->onDelete('cascade');
            $table->foreign('export_invoice_item_id')->references('id')->on('export_invoice_items')->onDelete('set null');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index('shipping_bill_id');
        });
    }

    public function down(): void { Schema::dropIfExists('shipping_bill_items'); }
};
