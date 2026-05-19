<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('partner_addresses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('partner_id');
            $table->enum('type', ['billing', 'shipping', 'registered', 'branch'])->default('billing')->index();
            $table->string('label', 64)->nullable();   // e.g. "Mumbai HQ"

            $table->string('contact_name')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();

            $table->string('line1');
            $table->string('line2')->nullable();
            $table->string('landmark')->nullable();
            $table->string('city', 64)->nullable();
            $table->string('state', 64)->nullable();
            $table->string('country', 64)->default('India');
            $table->string('postal_code', 16)->nullable();
            $table->string('gst_no_at_address', 32)->nullable();   // GST may differ per address (different state)

            $table->boolean('is_primary')->default(false);
            $table->boolean('is_active')->default(true);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('cascade');
            $table->index(['partner_id', 'type', 'is_primary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_addresses');
    }
};
