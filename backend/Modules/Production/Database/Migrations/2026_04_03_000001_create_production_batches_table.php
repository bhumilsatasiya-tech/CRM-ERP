<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('production_batches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 64);

            $table->unsignedBigInteger('target_product_id');
            $table->decimal('qty_planned', 18, 4);
            $table->decimal('qty_produced', 18, 4)->default(0);
            $table->decimal('qty_failed', 18, 4)->default(0);

            $table->unsignedBigInteger('raw_warehouse_id');       // source for input OUT
            $table->unsignedBigInteger('finished_warehouse_id');  // destination for output IN
            $table->unsignedBigInteger('sales_order_id')->nullable();

            $table->date('planned_start_date');
            $table->date('planned_end_date')->nullable();
            $table->dateTime('actual_start_date')->nullable();
            $table->dateTime('actual_end_date')->nullable();

            $table->string('output_batch_no', 64)->nullable();
            $table->date('output_expiry_date')->nullable();

            $table->decimal('material_cost', 18, 2)->default(0);

            $table->enum('status', ['draft', 'submitted', 'approved', 'in_progress', 'completed', 'cancelled'])
                ->default('draft')->index();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->string('cancellation_reason')->nullable();

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('target_product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('raw_warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->foreign('finished_warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');

            $table->unique(['company_id', 'code'], 'production_batches_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
            $table->index('planned_start_date');
        });
    }

    public function down(): void { Schema::dropIfExists('production_batches'); }
};
