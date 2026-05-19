<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loan_emi_schedule', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_id');
            $table->unsignedInteger('installment_no');
            $table->date('due_date');
            $table->decimal('principal_component', 18, 2);
            $table->decimal('interest_component', 18, 2);
            $table->decimal('emi_amount', 18, 2);
            $table->decimal('paid_amount', 18, 2)->default(0);
            $table->enum('status', ['pending', 'partial', 'paid', 'overdue'])->default('pending')->index();
            $table->timestamps();
            $table->foreign('loan_id')->references('id')->on('loans')->onDelete('cascade');
            $table->unique(['loan_id', 'installment_no']);
            $table->index('due_date');
        });
    }
    public function down(): void { Schema::dropIfExists('loan_emi_schedule'); }
};
