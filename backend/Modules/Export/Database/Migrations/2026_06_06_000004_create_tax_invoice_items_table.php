<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tax_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tax_invoice_id');
            $table->unsignedBigInteger('export_invoice_item_id')->nullable();
            $table->unsignedBigInteger('product_id');

            $table->string('hsn_code', 16)->nullable();
            $table->decimal('qty', 18, 4);
            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('discount_pct', 18, 2)->default(0);
            $table->decimal('tax_rate', 18, 2)->default(0);
            $table->decimal('line_subtotal', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('line_total', 18, 2)->default(0);

            $table->string('batch_no', 64)->nullable();
            $table->date('expiry_date')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tax_invoice_id')->references('id')->on('tax_invoices')->onDelete('cascade');
            $table->foreign('export_invoice_item_id')->references('id')->on('export_invoice_items')->onDelete('set null');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->index('tax_invoice_id');
        });
    }
    public function down(): void { Schema::dropIfExists('tax_invoice_items'); }
};
