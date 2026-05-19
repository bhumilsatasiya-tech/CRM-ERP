<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('production_batch_outputs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('batch_id');
            $table->unsignedBigInteger('product_id');

            $table->enum('output_type', ['finished', 'by_product', 'scrap'])->default('finished')->index();

            $table->decimal('qty_planned', 18, 4);
            $table->decimal('qty_produced', 18, 4)->default(0);

            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('line_value', 18, 2)->default(0);

            $table->string('output_batch_no', 64)->nullable();   // falls back to header.output_batch_no
            $table->date('expiry_date')->nullable();             // falls back to header.output_expiry_date
            $table->unsignedBigInteger('ledger_id')->nullable(); // FK to stock_ledger row created on completion

            $table->string('notes')->nullable();
            $table->timestamps();

            $table->foreign('batch_id')->references('id')->on('production_batches')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index('batch_id');
        });
    }

    public function down(): void { Schema::dropIfExists('production_batch_outputs'); }
};
