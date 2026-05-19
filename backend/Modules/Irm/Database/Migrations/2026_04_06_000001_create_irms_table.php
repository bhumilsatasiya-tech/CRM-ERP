<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('irms', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64)->comment('IRM number issued by bank/RBI');
            $table->unsignedBigInteger('export_invoice_id');

            $table->string('bank_name', 128)->nullable();
            $table->date('irm_date');
            $table->decimal('irm_amount_fcy', 18, 2);
            $table->string('irm_currency', 8);
            $table->decimal('exchange_rate', 18, 6)->default(1);
            $table->decimal('irm_amount_inr', 18, 2);
            $table->string('purpose_code', 16)->nullable();

            $table->enum('status', ['received', 'allocated', 'closed', 'cancelled'])->default('received')->index();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('export_invoice_id')->references('id')->on('export_invoices')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'irms_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
            $table->index('irm_date');
        });
    }

    public function down(): void { Schema::dropIfExists('irms'); }
};
