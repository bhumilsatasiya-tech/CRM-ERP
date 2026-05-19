<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('grn_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('grn_id');
            $table->unsignedBigInteger('purchase_order_item_id')->nullable();
            $table->unsignedBigInteger('product_id');

            $table->decimal('qty', 18, 4);
            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('line_total', 18, 2)->default(0);

            $table->string('batch_no', 64)->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('manufacturing_date')->nullable();
            $table->string('serial_no', 128)->nullable();

            $table->unsignedBigInteger('ledger_id')->nullable();   // FK to stock_ledger row created on receive
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('grn_id')->references('id')->on('grns')->onDelete('cascade');
            $table->foreign('purchase_order_item_id')->references('id')->on('purchase_order_items')->onDelete('set null');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index('grn_id');
        });
    }

    public function down(): void { Schema::dropIfExists('grn_items'); }
};
