<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('partner_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('partner_id');
            $table->string('bank_name');
            $table->string('branch')->nullable();
            $table->string('account_holder');
            $table->string('account_no', 64);
            $table->string('account_type', 32)->nullable();    // savings, current, etc.
            $table->string('ifsc', 32)->nullable();             // India
            $table->string('swift', 32)->nullable();            // International
            $table->string('iban', 64)->nullable();
            $table->string('currency', 8)->default('INR');
            $table->string('bank_country', 64)->default('India');
            $table->string('bank_address')->nullable();

            $table->boolean('is_primary')->default(false);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('cascade');
            $table->index(['partner_id', 'is_primary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_bank_accounts');
    }
};
