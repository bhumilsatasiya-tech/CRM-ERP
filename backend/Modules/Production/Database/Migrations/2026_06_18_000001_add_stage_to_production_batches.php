<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('production_batches', function (Blueprint $table) {
            // Stage: 'trial' = R&D run (writes only consumption, no FG output);
            //        'final' = production run (current behaviour — writes both consumption + outputs);
            //        'qc'    = post-production quality check (writes nothing; records pass/fail per output line in meta).
            $table->enum('stage', ['trial', 'final', 'qc'])->default('final')->after('status')->index();
            // Self-FK linking a final batch back to its trial run, or a QC batch to its final run.
            $table->unsignedBigInteger('parent_batch_id')->nullable()->after('stage');
            $table->foreign('parent_batch_id')->references('id')->on('production_batches')->onDelete('set null');
            $table->index(['company_id', 'stage', 'deleted_at']);
        });

        // Backfill: every existing row is a 'final' stage batch (already the column default).
    }

    public function down(): void
    {
        Schema::table('production_batches', function (Blueprint $table) {
            $table->dropForeign(['parent_batch_id']);
            $table->dropIndex(['company_id', 'stage', 'deleted_at']);
            $table->dropColumn(['stage', 'parent_batch_id']);
        });
    }
};
