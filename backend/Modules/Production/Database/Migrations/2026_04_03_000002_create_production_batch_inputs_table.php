<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('production_batch_inputs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('batch_id');
            $table->unsignedBigInteger('product_id');

            $table->decimal('qty_planned', 18, 4);
            $table->decimal('qty_consumed', 18, 4)->default(0);

            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('line_value', 18, 2)->default(0);

            $table->string('source_batch_no', 64)->nullable();   // which raw lot to consume from
            $table->unsignedBigInteger('ledger_id')->nullable(); // FK to stock_ledger row created on completion

            $table->string('notes')->nullable();
            $table->timestamps();

            $table->foreign('batch_id')->references('id')->on('production_batches')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index('batch_id');
        });
    }

    public function down(): void { Schema::dropIfExists('production_batch_inputs'); }
};
