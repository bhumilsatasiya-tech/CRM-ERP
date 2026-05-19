<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('production_quality_checks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('batch_id');

            $table->unsignedBigInteger('checked_by')->nullable();
            $table->dateTime('checked_at');

            $table->enum('result', ['pass', 'fail'])->index();
            $table->string('parameter')->nullable();   // e.g. "Purity %"
            $table->string('expected')->nullable();
            $table->string('observed')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->foreign('batch_id')->references('id')->on('production_batches')->onDelete('cascade');
            $table->index('batch_id');
        });
    }

    public function down(): void { Schema::dropIfExists('production_quality_checks'); }
};
