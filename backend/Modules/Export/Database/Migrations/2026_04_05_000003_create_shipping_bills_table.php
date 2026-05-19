<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shipping_bills', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);
            $table->unsignedBigInteger('export_invoice_id');
            $table->unsignedBigInteger('warehouse_id');

            $table->string('bl_no', 64)->nullable();
            $table->date('bl_date')->nullable();
            $table->string('vessel_name', 128)->nullable();
            $table->string('voyage_no', 64)->nullable();
            $table->string('carrier', 128)->nullable();
            $table->string('container_no', 64)->nullable();
            $table->string('port_of_loading', 128)->nullable();
            $table->string('port_of_discharge', 128)->nullable();
            $table->date('etd')->nullable();
            $table->date('eta')->nullable();

            $table->enum('status', ['draft', 'dispatched', 'cancelled'])->default('draft')->index();
            $table->timestamp('dispatched_at')->nullable();
            $table->unsignedBigInteger('dispatched_by')->nullable();
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
            $table->foreign('export_invoice_id')->references('id')->on('export_invoices')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'shipping_bills_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('shipping_bills'); }
};
