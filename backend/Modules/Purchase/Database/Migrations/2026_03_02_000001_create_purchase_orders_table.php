<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);
            $table->unsignedBigInteger('partner_id');         // supplier
            $table->unsignedBigInteger('warehouse_id')->nullable();   // default destination

            $table->date('order_date');
            $table->date('expected_date')->nullable();
            $table->string('reference', 128)->nullable();     // supplier ref / their PO #

            $table->string('currency', 8)->default('INR');
            $table->decimal('exchange_rate', 18, 6)->default(1);

            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('discount', 18, 2)->default(0);
            $table->decimal('shipping', 18, 2)->default(0);
            $table->decimal('total', 18, 2)->default(0);
            $table->decimal('received_amount', 18, 2)->default(0);

            $table->enum('status', ['draft', 'submitted', 'approved', 'partial', 'received', 'cancelled', 'closed'])
                  ->default('draft')->index();

            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
            $table->unique(['company_id', 'code'], 'po_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
            $table->index('order_date');
        });
    }

    public function down(): void { Schema::dropIfExists('purchase_orders'); }
};
