<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('formulas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);

            $table->unsignedBigInteger('target_product_id');
            $table->decimal('output_qty', 18, 4)->comment('Yield: how much the recipe produces in one batch');
            $table->unsignedBigInteger('output_uom_id')->nullable();

            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_active')->default(false);
            $table->enum('status', ['draft', 'active', 'inactive'])->default('draft')->index();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('target_product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('output_uom_id')->references('id')->on('product_units')->onDelete('set null');

            $table->unique(['company_id', 'code'], 'formulas_company_code_unique');
            $table->unique(['company_id', 'target_product_id', 'version'], 'formulas_company_product_version_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('formulas'); }
};
