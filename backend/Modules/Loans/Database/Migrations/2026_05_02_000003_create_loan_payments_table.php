<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loan_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_id');
            $table->unsignedBigInteger('emi_id')->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 18, 2);
            $table->string('mode', 32)->default('bank');
            $table->string('bank_ref', 128)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->foreign('loan_id')->references('id')->on('loans')->onDelete('cascade');
            $table->foreign('emi_id')->references('id')->on('loan_emi_schedule')->onDelete('set null');
            $table->index(['loan_id', 'payment_date']);
        });
    }
    public function down(): void { Schema::dropIfExists('loan_payments'); }
};
