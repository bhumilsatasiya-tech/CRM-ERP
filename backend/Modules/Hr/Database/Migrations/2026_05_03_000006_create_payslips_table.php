<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('salary_run_id');
            $table->unsignedBigInteger('employee_id');
            $table->json('breakdown')->nullable();
            $table->decimal('gross', 18, 2)->default(0);
            $table->decimal('total_deductions', 18, 2)->default(0);
            $table->decimal('net_pay', 18, 2)->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_ref', 128)->nullable();
            $table->timestamps();
            $table->foreign('salary_run_id')->references('id')->on('salary_runs')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('restrict');
            $table->unique(['salary_run_id', 'employee_id'], 'payslips_run_employee_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('payslips'); }
};
