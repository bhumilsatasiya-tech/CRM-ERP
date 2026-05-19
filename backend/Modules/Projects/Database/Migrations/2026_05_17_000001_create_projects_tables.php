<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Project Costing module — two tables:
 *
 *  - `projects`             — header (one row per costed project / product run)
 *  - `project_cost_entries` — line items, one row per cost (manual entry only,
 *                             no auto-pull from purchases/batches/salary — kept
 *                             intentionally separate so the operator can model
 *                             "what the finished product should/did really cost"
 *                             without the noise of operational documents).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('code', 32);
            $table->string('name');
            $table->text('description')->nullable();

            // What is being costed (optional — pure cost studies don't need a product).
            $table->unsignedBigInteger('target_product_id')->nullable();
            $table->decimal('target_qty', 18, 4)->default(0);
            $table->string('unit', 16)->nullable();

            $table->enum('status', ['planning', 'active', 'completed', 'cancelled'])->default('planning')->index();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            // Recomputed by ProjectCostingService::recalcTotals() on every entry add/edit/delete.
            $table->decimal('planned_total', 18, 2)->default(0);
            $table->decimal('actual_total',  18, 2)->default(0);

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('target_product_id')->references('id')->on('products')->onDelete('set null');
            $table->unique(['company_id', 'code', 'deleted_at'], 'projects_company_code_unique');
            $table->index(['company_id', 'status', 'deleted_at']);
        });

        Schema::create('project_cost_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('project_id');

            // Cost bucket — used both for grouping in the UI and for category totals.
            $table->enum('category', [
                'raw_material',
                'conversion',
                'packaging',
                'labour',
                'transport',
                'utilities',
                'overhead',
                'other',
            ])->index();

            $table->string('description');
            $table->decimal('qty',    18, 4)->default(1);
            $table->string('unit', 16)->nullable();
            $table->decimal('rate',   18, 4)->default(0);
            $table->decimal('amount', 18, 2)->default(0);    // qty × rate (recomputed in service)

            // Optional supplier / vendor reference (no auto-pull, just a manual tag).
            $table->unsignedBigInteger('partner_id')->nullable();

            $table->date('entry_date');
            $table->boolean('is_planned')->default(false);   // true = budget line, false = actual
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('set null');

            $table->index(['company_id', 'project_id', 'category']);
            $table->index('entry_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_cost_entries');
        Schema::dropIfExists('projects');
    }
};
