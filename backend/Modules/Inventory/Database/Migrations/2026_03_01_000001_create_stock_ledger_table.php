<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_ledger', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('warehouse_id');
            $table->unsignedBigInteger('product_id');

            $table->enum('movement_type', ['opening', 'in', 'out', 'transfer_in', 'transfer_out', 'adjustment'])
                  ->index();

            // Polymorphic source document
            $table->string('reference_type', 191)->nullable()->index();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_no', 64)->nullable();

            // Batch & expiry tracking (when product.has_batches/has_expiry)
            $table->string('batch_no', 64)->nullable()->index();
            $table->date('expiry_date')->nullable()->index();
            $table->string('serial_no', 128)->nullable();

            // The movement
            $table->decimal('qty', 18, 4);                  // signed by movement_type
            $table->decimal('balance_qty', 18, 4);          // running balance after this row
            $table->decimal('rate', 18, 4)->default(0);
            $table->decimal('value', 18, 2)->default(0);

            $table->timestamp('posted_at')->index();        // effective date

            // Reversal tracking (for cancellations)
            $table->boolean('is_reversal')->default(false);
            $table->unsignedBigInteger('reverses_ledger_id')->nullable();
            $table->boolean('is_reversed')->default(false);
            $table->unsignedBigInteger('reversed_by_ledger_id')->nullable();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            // No softDeletes — ledger is immutable. Reversal rows are the only way to "undo".

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('reverses_ledger_id')->references('id')->on('stock_ledger')->onDelete('set null');

            // Hot indexes — every read filters on (product, warehouse) or (company, posted_at)
            $table->index(['company_id', 'posted_at'], 'sl_company_posted_idx');
            $table->index(['product_id', 'warehouse_id', 'posted_at', 'id'], 'sl_pwd_idx');
            $table->index(['company_id', 'warehouse_id', 'product_id'], 'sl_cwp_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_ledger');
    }
};
