<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add three things to `companies`:
 *  - tan_no                 (Tax Deduction Account Number, Indian regulator)
 *  - bill_to_*  block       (legal billing address — used on outgoing invoices)
 *  - ship_to_*  block       (default delivery address — used on POs / shipping bills)
 *
 * The existing `address_*` block stays as the company's primary / registered address.
 * Bill-to and ship-to default to the registered address on the form if left blank.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('tan_no', 32)->nullable()->after('iec_no');

            // Bill-to address
            $table->string('bill_to_line1')->nullable()->after('postal_code');
            $table->string('bill_to_line2')->nullable()->after('bill_to_line1');
            $table->string('bill_to_city', 64)->nullable()->after('bill_to_line2');
            $table->string('bill_to_state', 64)->nullable()->after('bill_to_city');
            $table->string('bill_to_country', 64)->nullable()->after('bill_to_state');
            $table->string('bill_to_postal_code', 16)->nullable()->after('bill_to_country');

            // Ship-to address
            $table->string('ship_to_line1')->nullable()->after('bill_to_postal_code');
            $table->string('ship_to_line2')->nullable()->after('ship_to_line1');
            $table->string('ship_to_city', 64)->nullable()->after('ship_to_line2');
            $table->string('ship_to_state', 64)->nullable()->after('ship_to_city');
            $table->string('ship_to_country', 64)->nullable()->after('ship_to_state');
            $table->string('ship_to_postal_code', 16)->nullable()->after('ship_to_country');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'tan_no',
                'bill_to_line1', 'bill_to_line2', 'bill_to_city', 'bill_to_state', 'bill_to_country', 'bill_to_postal_code',
                'ship_to_line1', 'ship_to_line2', 'ship_to_city', 'ship_to_state', 'ship_to_country', 'ship_to_postal_code',
            ]);
        });
    }
};
