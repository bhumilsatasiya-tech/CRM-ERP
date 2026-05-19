<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * User PINs — one PIN per user, hashed (bcrypt like passwords). Used to unlock
 * any "locked" sensitive module. After 3 wrong attempts the user is locked out
 * for 10 minutes (configurable via failed_attempts/locked_until).
 *
 * Unlock sessions themselves live in Laravel Cache (15-60 min TTL), not here —
 * keeps the table small and avoids the cleanup-job problem.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_pins', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('pin_hash');
            $table->unsignedTinyInteger('failed_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->timestamp('last_unlock_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_pins');
    }
};
