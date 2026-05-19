<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inter_company_invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('from_company_id')->comment('Seller (e.g. Co. B supplying)');
            $table->unsignedBigInteger('to_company_id')->comment('Buyer (e.g. Co. A export)');
            $table->string('code', 64);

            $table->unsignedBigInteger('from_warehouse_id');
            $table->unsignedBigInteger('to_warehouse_id');

            $table->date('invoice_date');
            $table->date('due_date')->nullable();

            $table->string('currency', 8)->default('INR');
            $table->decimal('exchange_rate', 18, 6)->default(1);

            $table->decimal('cost_basis', 18, 2)->default(0);
            $table->decimal('profit_pct', 5, 2)->default(0);
            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('total', 18, 2)->default(0);

            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft')->index();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();

            // Mirror documents created on post
            $table->unsignedBigInteger('linked_sale_invoice_id')->nullable();
            $table->unsignedBigInteger('linked_purchase_invoice_id')->nullable();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('from_company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('to_company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('from_warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->foreign('to_warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->foreign('linked_sale_invoice_id')->references('id')->on('invoices')->onDelete('set null');
            $table->foreign('linked_purchase_invoice_id')->references('id')->on('purchase_invoices')->onDelete('set null');

            $table->unique(['from_company_id', 'code'], 'ici_from_company_code_unique');
            $table->index(['from_company_id', 'status', 'deleted_at']);
            $table->index(['to_company_id', 'status', 'deleted_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('inter_company_invoices'); }
};
