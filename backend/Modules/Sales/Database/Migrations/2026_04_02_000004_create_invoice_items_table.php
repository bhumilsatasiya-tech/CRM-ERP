<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id');
            $table->unsignedBigInteger('sales_order_item_id')->nullable();
            $table->unsignedBigInteger('product_id');
            $table->decimal('qty', 18, 4);
            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('discount_pct', 6, 2)->default(0);
            $table->decimal('tax_rate', 6, 2)->default(0);
            $table->decimal('line_subtotal', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('line_total', 18, 2)->default(0);
            $table->string('batch_no', 64)->nullable();
            $table->date('expiry_date')->nullable();
            $table->unsignedBigInteger('ledger_id')->nullable();    // stock OUT row
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('sales_order_item_id')->references('id')->on('sales_order_items')->onDelete('set null');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index('invoice_id');
        });
    }

    public function down(): void { Schema::dropIfExists('invoice_items'); }
};
