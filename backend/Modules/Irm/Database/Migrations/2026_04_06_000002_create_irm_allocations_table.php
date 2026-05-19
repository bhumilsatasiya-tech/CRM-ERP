<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('irm_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('irm_id');
            $table->unsignedBigInteger('export_invoice_id');

            $table->decimal('amount_fcy', 18, 2);
            $table->decimal('amount_inr', 18, 2);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->foreign('irm_id')->references('id')->on('irms')->onDelete('cascade');
            $table->foreign('export_invoice_id')->references('id')->on('export_invoices')->onDelete('restrict');
            $table->index('irm_id');
        });
    }

    public function down(): void { Schema::dropIfExists('irm_allocations'); }
};
