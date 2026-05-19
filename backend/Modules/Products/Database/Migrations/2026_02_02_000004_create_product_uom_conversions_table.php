<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_uom_conversions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('unit_id');
            // 1 (this unit) = factor × (product.unit_id base)
            $table->decimal('conversion_factor', 18, 8)->default(1);
            $table->boolean('is_purchase_default')->default(false);
            $table->boolean('is_sales_default')->default(false);
            $table->string('notes')->nullable();
            $table->boolean('is_active')->default(true);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('unit_id')->references('id')->on('product_units')->onDelete('restrict');
            $table->unique(['product_id', 'unit_id'], 'product_uom_conv_product_unit_unique');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_uom_conversions');
    }
};
