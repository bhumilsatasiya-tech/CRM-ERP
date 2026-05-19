<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Module locks — per-company on/off switch for the "sensitive" modules
 * (Project Costing, Production, Export & Bank). When `is_enabled` is true,
 * users must enter their PIN to access that module. When false, the module
 * behaves normally (only the underlying RBAC permission check applies).
 *
 * Admin toggles these from Settings → Security & Module Locks.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('module_locks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('module_key', 64);  // 'project_costing' | 'production' | 'export_bank'
            $table->boolean('is_enabled')->default(false);
            $table->unsignedSmallInteger('unlock_minutes')->default(30);  // PIN unlock TTL
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->unique(['company_id', 'module_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_locks');
    }
};
