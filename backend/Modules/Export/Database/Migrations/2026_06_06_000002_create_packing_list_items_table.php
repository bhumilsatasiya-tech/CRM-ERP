<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('packing_list_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('packing_list_id');
            $table->unsignedBigInteger('export_invoice_item_id')->nullable();
            $table->unsignedBigInteger('product_id');

            $table->decimal('qty', 18, 4);
            $table->unsignedInteger('packages')->default(0);
            $table->string('marks', 191)->nullable();
            $table->decimal('gross_weight_kg', 18, 3)->default(0);
            $table->decimal('net_weight_kg', 18, 3)->default(0);
            $table->string('dimensions', 64)->nullable();    // e.g. "100×80×50 cm"
            $table->string('batch_no', 64)->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('packing_list_id')->references('id')->on('packing_lists')->onDelete('cascade');
            $table->foreign('export_invoice_item_id')->references('id')->on('export_invoice_items')->onDelete('set null');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->index('packing_list_id');
        });
    }
    public function down(): void { Schema::dropIfExists('packing_list_items'); }
};
