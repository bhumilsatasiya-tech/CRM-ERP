<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('formula_components', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('formula_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('uom_id')->nullable();

            $table->decimal('qty', 18, 4)->comment('Required qty per recipe yield (output_qty)');
            $table->decimal('wastage_pct', 5, 2)->default(0);

            $table->string('notes')->nullable();
            $table->timestamps();

            $table->foreign('formula_id')->references('id')->on('formulas')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('uom_id')->references('id')->on('product_units')->onDelete('set null');
            $table->index('formula_id');
        });
    }

    public function down(): void { Schema::dropIfExists('formula_components'); }
};
