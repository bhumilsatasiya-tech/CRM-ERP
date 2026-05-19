<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->enum('scope', ['global', 'company', 'user'])->default('global')->index();
            $table->unsignedBigInteger('scope_id')->nullable()->index();
            $table->string('group', 64)->default('general')->index();
            $table->string('key', 128);
            $table->json('value')->nullable();
            $table->enum('type', ['string', 'int', 'bool', 'json', 'select', 'text'])->default('string');
            $table->string('label')->nullable();
            $table->text('description')->nullable();
            $table->json('options')->nullable();
            $table->boolean('is_public')->default(false);
            $table->boolean('is_system')->default(false);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->unique(['scope', 'scope_id', 'key'], 'settings_scope_key_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
