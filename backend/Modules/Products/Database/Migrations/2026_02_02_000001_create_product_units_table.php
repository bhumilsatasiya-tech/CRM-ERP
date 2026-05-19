<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_units', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 16);
            $table->string('name', 64);
            $table->string('symbol', 16);
            $table->enum('type', ['weight', 'volume', 'count', 'length', 'area', 'time', 'other'])->default('count');

            $table->unsignedBigInteger('base_unit_id')->nullable();
            $table->decimal('conversion_factor', 18, 8)->default(1);
            $table->boolean('is_base')->default(false);

            $table->unsignedTinyInteger('decimals_allowed')->default(2);
            $table->boolean('is_active')->default(true);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('base_unit_id')->references('id')->on('product_units')->onDelete('set null');
            $table->unique(['company_id', 'code'], 'product_units_company_code_unique');
            $table->index(['company_id', 'type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_units');
    }
};
