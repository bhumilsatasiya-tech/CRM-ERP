<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');

            // doc_type matches sequence keys (invoice, quotation, sales_order, purchase_order, export_invoice, tax_invoice, etc.)
            $table->string('doc_type', 32)->index();

            $table->string('name', 128);
            $table->longText('html');                 // Body HTML with {{placeholders}} and {{#items}}...{{/items}} loops
            $table->longText('css')->nullable();      // Optional separate CSS (also can inline in <style> in html)
            $table->string('paper_size', 16)->default('a4');     // a4 | letter | legal
            $table->string('orientation', 16)->default('portrait'); // portrait | landscape

            $table->boolean('is_default')->default(true);  // The active template per (company, doc_type) — only one default each
            $table->boolean('is_active')->default(true);

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->index(['company_id', 'doc_type', 'is_default', 'deleted_at'], 'doc_templates_lookup_idx');
        });
    }

    public function down(): void { Schema::dropIfExists('document_templates'); }
};
