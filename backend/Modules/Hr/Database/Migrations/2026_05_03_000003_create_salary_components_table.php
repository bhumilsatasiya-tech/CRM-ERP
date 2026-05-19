<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('salary_components', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 32);
            $table->string('name');
            $table->enum('type', ['earning', 'deduction'])->index();
            $table->boolean('is_taxable')->default(false);
            $table->enum('formula_type', ['fixed', 'percent_of_basic'])->default('fixed');
            $table->decimal('formula_value', 10, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'salary_components_company_code_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('salary_components'); }
};
