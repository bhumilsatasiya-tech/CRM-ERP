<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('due_date')->nullable();
            $table->unsignedBigInteger('assignee_id')->nullable();
            $table->enum('status', ['open', 'in_progress', 'done', 'cancelled'])->default('open')->index();
            $table->enum('priority', ['low', 'med', 'high'])->default('med')->index();
            $table->string('related_type', 191)->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->string('google_event_id', 191)->nullable();
            $table->timestamp('google_synced_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('assignee_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['related_type', 'related_id'], 'tasks_morph_idx');
            $table->index(['company_id', 'status', 'due_date']);
        });
    }
    public function down(): void { Schema::dropIfExists('tasks'); }
};
