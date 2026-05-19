<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add two tax/regulatory fields to `partners`:
 *  - vat_no:  EU/UK/Gulf VAT registration number (mostly used for overseas clients).
 *  - cin_no:  Corporate Identification Number (Indian Companies Act registration).
 *
 * Both are nullable strings. Indexed on cin_no for legal-entity lookups.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->string('vat_no', 32)->nullable()->after('pan_no');
            $table->string('cin_no', 32)->nullable()->after('vat_no');
            $table->index('cin_no');
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->dropIndex(['cin_no']);
            $table->dropColumn(['vat_no', 'cin_no']);
        });
    }
};
