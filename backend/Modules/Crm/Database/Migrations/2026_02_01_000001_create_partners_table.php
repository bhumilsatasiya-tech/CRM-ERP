<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 32);
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->boolean('is_company')->default(true);
            $table->enum('type', ['client', 'supplier', 'manufacturer', 'employee', 'other'])->default('client')->index();

            // Contact
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('mobile', 32)->nullable();
            $table->string('website')->nullable();

            // Tax
            $table->string('gst_no', 32)->nullable();
            $table->string('pan_no', 32)->nullable();
            $table->enum('tax_treatment', ['registered', 'unregistered', 'composition', 'sez', 'overseas'])
                  ->default('unregistered')
                  ->index();

            // Business
            $table->string('industry', 64)->nullable();
            $table->enum('segment', ['b2b', 'b2c', 'distributor', 'oem', 'other'])->default('b2b')->index();

            // Finance
            $table->string('currency', 8)->default('INR');
            $table->decimal('credit_limit', 18, 2)->default(0);
            $table->unsignedInteger('credit_days')->default(0);
            $table->decimal('opening_balance', 18, 2)->default(0);
            $table->enum('opening_balance_type', ['debit', 'credit'])->default('debit');
            $table->unsignedInteger('default_payment_terms_days')->default(0);

            // Defaults (FKs filled later — keep nullable for now)
            $table->unsignedBigInteger('default_warehouse_id')->nullable();
            $table->unsignedBigInteger('default_billing_address_id')->nullable();
            $table->unsignedBigInteger('default_shipping_address_id')->nullable();
            $table->unsignedBigInteger('default_bank_account_id')->nullable();

            // Flags
            $table->boolean('is_active')->default(true);
            $table->boolean('is_blacklisted')->default(false);
            $table->string('blacklist_reason')->nullable();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('default_warehouse_id')->references('id')->on('warehouses')->onDelete('set null');

            $table->unique(['company_id', 'code'], 'partners_company_code_unique');
            $table->index(['company_id', 'type', 'is_active', 'deleted_at'], 'partners_company_type_active_idx');
            $table->index(['company_id', 'name']);
            $table->index('email');
            $table->index('phone');
            $table->index('gst_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partners');
    }
};
