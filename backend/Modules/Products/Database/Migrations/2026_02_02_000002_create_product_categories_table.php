<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('code', 32);
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('depth')->default(0);
            $table->string('path', 512)->nullable();   // materialized path: 1/4/12 (for fast tree queries)
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('parent_id')->references('id')->on('product_categories')->onDelete('set null');
            $table->unique(['company_id', 'code'], 'product_categories_company_code_unique');
            $table->index(['company_id', 'parent_id']);
            $table->index(['company_id', 'is_active', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_categories');
    }
};
