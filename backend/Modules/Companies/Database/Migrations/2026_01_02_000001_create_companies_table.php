<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('code', 16)->unique();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->enum('type', ['export', 'supplying', 'trading', 'other'])->default('export')->index();

            // Tax / regulatory
            $table->string('gst_no', 32)->nullable();
            $table->string('pan_no', 32)->nullable();
            $table->string('cin_no', 32)->nullable();
            $table->string('iec_no', 32)->nullable();
            $table->string('registration_no', 64)->nullable();

            // Contact
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('website')->nullable();

            // Address
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city', 64)->nullable();
            $table->string('state', 64)->nullable();
            $table->string('country', 64)->default('India');
            $table->string('postal_code', 16)->nullable();

            // Finance
            $table->string('currency', 8)->default('INR');
            $table->date('fiscal_year_start')->nullable();

            $table->string('logo_path')->nullable();
            $table->boolean('is_active')->default(true);

            $table->json('meta')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'is_active', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
