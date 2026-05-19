<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('salary_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);
            $table->string('period', 16);
            $table->date('period_start');
            $table->date('period_end');
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft')->index();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'salary_runs_company_code_unique');
            $table->index(['company_id', 'period']);
        });
    }
    public function down(): void { Schema::dropIfExists('salary_runs'); }
};
