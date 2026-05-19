<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('code', 32);
            $table->string('name');
            $table->enum('type', [
                'finished',     // Finished goods
                'raw',          // Raw material
                'packaging',    // Packaging supplies
                'quarantine',   // Hold / pending QC
                'transit',      // Goods in transit / virtual
                'reject',       // Rejected stock
                'other',
            ])->default('finished')->index();

            $table->string('address_line1')->nullable();
            $table->string('city', 64)->nullable();
            $table->string('state', 64)->nullable();
            $table->string('country', 64)->default('India');
            $table->string('postal_code', 16)->nullable();

            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);

            $table->json('meta')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'is_active', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
