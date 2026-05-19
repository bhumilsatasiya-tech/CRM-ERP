<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('grns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);
            $table->unsignedBigInteger('purchase_order_id')->nullable();
            $table->unsignedBigInteger('partner_id');
            $table->unsignedBigInteger('warehouse_id');

            $table->date('grn_date');
            $table->string('supplier_invoice_no', 64)->nullable();
            $table->date('supplier_invoice_date')->nullable();
            $table->string('vehicle_no', 32)->nullable();
            $table->string('lr_no', 32)->nullable();          // transporter receipt

            $table->enum('status', ['draft', 'received', 'cancelled'])->default('draft')->index();

            $table->unsignedBigInteger('received_by')->nullable();
            $table->timestamp('received_at')->nullable();
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
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('set null');
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'grns_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('grns'); }
};
