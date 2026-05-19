<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inter_company_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('inter_company_invoice_id');
            $table->unsignedBigInteger('product_id');

            $table->decimal('qty', 18, 4);
            $table->decimal('cost_rate', 18, 4)->default(0);
            $table->decimal('sell_rate', 18, 4)->default(0);
            $table->decimal('tax_rate', 18, 2)->default(0);
            $table->decimal('line_subtotal', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('line_total', 18, 2)->default(0);

            $table->string('batch_no', 64)->nullable();
            $table->date('expiry_date')->nullable();

            $table->unsignedBigInteger('from_ledger_id')->nullable();
            $table->unsignedBigInteger('to_ledger_id')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('inter_company_invoice_id', 'ici_items_ici_id_fk')->references('id')->on('inter_company_invoices')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('from_ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->foreign('to_ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');
            $table->index('inter_company_invoice_id', 'ici_items_ici_id_idx');
        });
    }

    public function down(): void { Schema::dropIfExists('inter_company_invoice_items'); }
};
