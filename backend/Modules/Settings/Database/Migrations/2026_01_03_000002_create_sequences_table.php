<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('doc_type', 64);
            $table->string('name', 128);
            $table->string('prefix', 16)->default('');
            $table->string('suffix', 16)->default('');
            $table->unsignedBigInteger('current_number')->default(0);
            $table->unsignedSmallInteger('padding')->default(5);
            $table->string('format', 128)->default('{prefix}/{year}/{number}');
            $table->enum('reset_period', ['never', 'yearly', 'monthly'])->default('yearly');
            $table->date('last_reset_at')->nullable();
            $table->boolean('is_active')->default(true);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->unique(['company_id', 'doc_type'], 'sequences_company_doctype_unique');
            $table->index(['company_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sequences');
    }
};
