<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('attachable_type', 191);
            $table->unsignedBigInteger('attachable_id');
            $table->enum('category', ['kyc', 'coa', 'msds', 'photo', 'contract', 'invoice_pdf', 'other'])->default('other');
            $table->string('original_filename');
            $table->string('disk', 32)->default('local');
            $table->string('path');
            $table->string('mime_type', 128)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->index(['attachable_type', 'attachable_id'], 'documents_morph_idx');
            $table->index(['company_id', 'category', 'deleted_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('documents'); }
};
