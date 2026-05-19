<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_transfer_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('transfer_id');
            $table->unsignedBigInteger('product_id');
            $table->decimal('qty', 18, 4);
            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('value', 18, 2)->default(0);

            $table->string('batch_no', 64)->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('serial_no', 128)->nullable();

            // Two ledger rows per line on a fully-completed transfer (out + in)
            $table->unsignedBigInteger('out_ledger_id')->nullable();
            $table->unsignedBigInteger('in_ledger_id')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('transfer_id')->references('id')->on('stock_transfers')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('out_ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->foreign('in_ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index(['transfer_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_lines');
    }
};
