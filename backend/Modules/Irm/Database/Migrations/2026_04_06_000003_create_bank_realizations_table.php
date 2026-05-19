<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bank_realizations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('irm_id');

            $table->date('realization_date');
            $table->string('bank_ref', 128)->nullable();
            $table->decimal('commission', 18, 2)->default(0);
            $table->decimal('tds', 18, 2)->default(0);
            $table->decimal('net_inr', 18, 2);

            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('irm_id')->references('id')->on('irms')->onDelete('restrict');
            $table->index(['company_id', 'realization_date']);
        });
    }

    public function down(): void { Schema::dropIfExists('bank_realizations'); }
};
