<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');

            // Identity
            $table->string('code', 64);                   // SKU
            $table->string('barcode', 64)->nullable();
            $table->string('name');
            $table->text('description')->nullable();

            // Classification
            $table->unsignedBigInteger('category_id')->nullable();
            $table->enum('type', ['raw', 'finished', 'packaging', 'consumable', 'service', 'other'])
                  ->default('finished')->index();
            $table->boolean('is_company_made')->default(false);

            // Default UoM
            $table->unsignedBigInteger('unit_id');

            // Tax
            $table->string('hsn_code', 16)->nullable();
            $table->decimal('tax_rate', 6, 2)->default(0);   // % e.g. 18.00

            // Costing
            $table->decimal('standard_cost', 18, 4)->default(0);
            $table->decimal('last_purchase_cost', 18, 4)->default(0);
            $table->decimal('opening_stock_qty', 18, 4)->default(0);
            $table->decimal('opening_stock_value', 18, 2)->default(0);

            // Selling
            $table->decimal('standard_price', 18, 4)->default(0);
            $table->decimal('mrp', 18, 4)->default(0);
            $table->string('currency', 8)->default('INR');

            // Inventory params
            $table->decimal('reorder_level', 18, 4)->default(0);
            $table->decimal('reorder_qty', 18, 4)->default(0);
            $table->decimal('min_stock', 18, 4)->default(0);
            $table->decimal('max_stock', 18, 4)->default(0);
            $table->unsignedInteger('lead_time_days')->default(0);
            $table->unsignedInteger('shelf_life_days')->nullable();

            // Tracking
            $table->boolean('has_batches')->default(false);
            $table->boolean('has_expiry')->default(false);
            $table->boolean('has_serials')->default(false);

            // Defaults
            $table->unsignedBigInteger('default_warehouse_id')->nullable();

            // Flags
            $table->boolean('is_active')->default(true);
            $table->boolean('is_purchasable')->default(true);
            $table->boolean('is_sellable')->default(true);
            $table->boolean('is_stockable')->default(true);

            // Dimensions (for shipping calc)
            $table->decimal('weight', 12, 4)->nullable();
            $table->unsignedBigInteger('weight_unit_id')->nullable();
            $table->decimal('length', 12, 4)->nullable();
            $table->decimal('width', 12, 4)->nullable();
            $table->decimal('height', 12, 4)->nullable();

            $table->string('image_path')->nullable();
            $table->json('meta')->nullable();
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('category_id')->references('id')->on('product_categories')->onDelete('set null');
            $table->foreign('unit_id')->references('id')->on('product_units')->onDelete('restrict');
            $table->foreign('default_warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
            $table->foreign('weight_unit_id')->references('id')->on('product_units')->onDelete('set null');

            $table->unique(['company_id', 'code'], 'products_company_code_unique');
            $table->index(['company_id', 'type', 'is_active', 'deleted_at']);
            $table->index(['company_id', 'category_id']);
            $table->index('barcode');
            $table->index('hsn_code');
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
