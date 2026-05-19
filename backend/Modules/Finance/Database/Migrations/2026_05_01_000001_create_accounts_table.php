<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 32);
            $table->string('name');
            $table->enum('type', ['asset', 'liability', 'equity', 'income', 'expense'])->index();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->boolean('is_group')->default(false);
            $table->boolean('is_system')->default(false);
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('parent_id')->references('id')->on('accounts')->onDelete('restrict');
            $table->unique(['company_id', 'code'], 'accounts_company_code_unique');
            $table->index(['company_id', 'type', 'deleted_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('accounts'); }
};
