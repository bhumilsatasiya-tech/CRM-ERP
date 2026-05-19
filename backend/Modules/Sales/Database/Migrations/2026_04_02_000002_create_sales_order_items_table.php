<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sales_order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sales_order_id');
            $table->unsignedBigInteger('product_id');
            $table->decimal('qty', 18, 4);
            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('discount_pct', 6, 2)->default(0);
            $table->decimal('tax_rate', 6, 2)->default(0);
            $table->decimal('line_subtotal', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('line_total', 18, 2)->default(0);
            $table->decimal('invoiced_qty', 18, 4)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->index(['sales_order_id', 'product_id']);
        });
    }

    public function down(): void { Schema::dropIfExists('sales_order_items'); }
};
