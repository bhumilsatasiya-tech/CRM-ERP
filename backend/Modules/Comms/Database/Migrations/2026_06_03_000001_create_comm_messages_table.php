<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('comm_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->enum('direction', ['outbound', 'inbound'])->default('outbound')->index();
            $table->enum('channel', ['email', 'whatsapp', 'sms'])->index();
            $table->string('to_addr', 191);
            $table->string('from_addr', 191)->nullable();
            $table->string('subject')->nullable();
            $table->text('body');
            $table->enum('status', ['queued', 'sent', 'delivered', 'failed'])->default('queued')->index();
            $table->string('provider_message_id', 191)->nullable();
            $table->timestamp('attempted_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->text('error')->nullable();
            $table->string('related_type', 191)->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('restrict');
            $table->index(['related_type', 'related_id'], 'comm_messages_morph_idx');
            $table->index(['company_id', 'channel', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('comm_messages'); }
};
