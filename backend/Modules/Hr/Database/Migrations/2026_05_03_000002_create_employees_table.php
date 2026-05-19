<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 32);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('designation_id')->nullable();

            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->date('joining_date')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->enum('status', ['active', 'inactive', 'resigned', 'terminated'])->default('active')->index();

            $table->string('pan', 32)->nullable();
            $table->string('aadhar', 32)->nullable();
            $table->string('bank_name', 128)->nullable();
            $table->string('bank_account_no', 64)->nullable();
            $table->string('bank_ifsc', 32)->nullable();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('designation_id')->references('id')->on('designations')->onDelete('set null');
            $table->unique(['company_id', 'code'], 'employees_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('employees'); }
};
