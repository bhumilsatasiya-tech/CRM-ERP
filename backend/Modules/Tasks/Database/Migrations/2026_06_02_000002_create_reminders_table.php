<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('task_id')->nullable();
            $table->dateTime('notify_at');
            $table->enum('channel', ['email', 'in_app'])->default('in_app');
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending')->index();
            $table->timestamp('sent_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->index(['status', 'notify_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('reminders'); }
};
