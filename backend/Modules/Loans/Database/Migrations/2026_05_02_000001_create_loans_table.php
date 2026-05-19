<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);
            $table->enum('type', ['borrowed', 'given'])->index();
            $table->unsignedBigInteger('partner_id')->nullable();

            $table->decimal('principal', 18, 2);
            $table->decimal('interest_rate_pct', 5, 2)->default(0);
            $table->unsignedInteger('tenure_months');
            $table->date('start_date');

            $table->decimal('emi_amount', 18, 2)->default(0);
            $table->decimal('total_payable', 18, 2)->default(0);
            $table->decimal('total_interest', 18, 2)->default(0);
            $table->decimal('outstanding_principal', 18, 2)->default(0);

            $table->enum('status', ['draft', 'active', 'closed', 'cancelled'])->default('draft')->index();
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('set null');
            $table->unique(['company_id', 'code'], 'loans_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('loans'); }
};
