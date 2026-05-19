<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_adjustment_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adjustment_id');
            $table->unsignedBigInteger('product_id');

            $table->decimal('current_qty', 18, 4)->default(0);   // snapshot at draft creation
            $table->decimal('counted_qty', 18, 4);                // what was actually counted / target value
            $table->decimal('difference', 18, 4)->default(0);     // counted - current  (signed)
            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('value', 18, 2)->default(0);          // difference * rate

            $table->string('batch_no', 64)->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('serial_no', 128)->nullable();

            $table->unsignedBigInteger('ledger_id')->nullable();  // FK to stock_ledger row created on approval
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->foreign('adjustment_id')->references('id')->on('stock_adjustments')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index(['adjustment_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustment_lines');
    }
};
