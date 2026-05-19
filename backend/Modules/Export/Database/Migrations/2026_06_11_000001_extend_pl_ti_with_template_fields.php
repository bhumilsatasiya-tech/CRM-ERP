<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('packing_lists')) {
            Schema::table('packing_lists', function (Blueprint $table) {
                $cols = [
                    'partner_id'                 => fn() => $table->foreignId('partner_id')->nullable()->after('export_invoice_id')->constrained('partners')->nullOnDelete(),
                    'invoice_date'               => fn() => $table->date('invoice_date')->nullable()->after('pl_date'),
                    'date_of_supply'             => fn() => $table->date('date_of_supply')->nullable()->after('invoice_date'),
                    'transport_mode'             => fn() => $table->enum('transport_mode', ['air','sea','road','rail','multimodal','other'])->nullable()->after('date_of_supply'),
                    'incoterm'                   => fn() => $table->enum('incoterm', ['FOB','CIF','EXW','CFR','DAP','DDP'])->nullable()->after('transport_mode'),
                    'lut_no'                     => fn() => $table->string('lut_no', 64)->nullable()->after('incoterm'),
                    'lut_date'                   => fn() => $table->date('lut_date')->nullable()->after('lut_no'),
                    'tax_details'                => fn() => $table->string('tax_details', 255)->nullable()->after('lut_date'),
                    'place_of_supply'            => fn() => $table->string('place_of_supply', 64)->nullable()->after('tax_details'),
                    'consignee_partner_id'       => fn() => $table->foreignId('consignee_partner_id')->nullable()->after('place_of_supply')->constrained('partners')->nullOnDelete(),
                    'consignee_name'             => fn() => $table->string('consignee_name', 255)->nullable()->after('consignee_partner_id'),
                    'consignee_address'          => fn() => $table->text('consignee_address')->nullable()->after('consignee_name'),
                    'consignee_country'          => fn() => $table->char('consignee_country', 2)->nullable()->after('consignee_address'),
                    'consignee_contact_person'   => fn() => $table->string('consignee_contact_person', 255)->nullable()->after('consignee_country'),
                    'consignee_phone'            => fn() => $table->string('consignee_phone', 64)->nullable()->after('consignee_contact_person'),
                    'consignee_email'            => fn() => $table->string('consignee_email', 255)->nullable()->after('consignee_phone'),
                    'consignee_registration_no'  => fn() => $table->string('consignee_registration_no', 64)->nullable()->after('consignee_email'),
                    'notify_party_name'          => fn() => $table->string('notify_party_name', 255)->nullable()->after('consignee_registration_no'),
                    'notify_party_address'       => fn() => $table->text('notify_party_address')->nullable()->after('notify_party_name'),
                    'port_of_loading'            => fn() => $table->string('port_of_loading', 128)->nullable()->after('notify_party_address'),
                    'port_of_discharge'          => fn() => $table->string('port_of_discharge', 128)->nullable()->after('port_of_loading'),
                    'loading_destination'        => fn() => $table->string('loading_destination', 255)->nullable()->after('port_of_discharge'),
                    'final_destination'          => fn() => $table->string('final_destination', 255)->nullable()->after('loading_destination'),
                    'total_pallet_qty'           => fn() => $table->unsignedInteger('total_pallet_qty')->default(0)->after('total_packages'),
                ];
                foreach ($cols as $name => $cb) {
                    if (!Schema::hasColumn('packing_lists', $name)) $cb();
                }
            });
        }

        if (Schema::hasTable('packing_list_items')) {
            Schema::table('packing_list_items', function (Blueprint $table) {
                if (!Schema::hasColumn('packing_list_items', 'shipper_unit')) $table->string('shipper_unit', 32)->nullable()->after('packages');
            });
        }

        if (Schema::hasTable('tax_invoices')) {
            Schema::table('tax_invoices', function (Blueprint $table) {
                $cols = [
                    'date_of_supply'             => fn() => $table->date('date_of_supply')->nullable()->after('invoice_date'),
                    'transport_mode'             => fn() => $table->enum('transport_mode', ['air','sea','road','rail','multimodal','other'])->nullable()->after('date_of_supply'),
                    'incoterm'                   => fn() => $table->enum('incoterm', ['FOB','CIF','EXW','CFR','DAP','DDP'])->nullable()->after('transport_mode'),
                    'lut_no'                     => fn() => $table->string('lut_no', 64)->nullable()->after('incoterm'),
                    'lut_date'                   => fn() => $table->date('lut_date')->nullable()->after('lut_no'),
                    'tax_details'                => fn() => $table->string('tax_details', 255)->nullable()->after('lut_date'),
                    'consignee_partner_id'       => fn() => $table->foreignId('consignee_partner_id')->nullable()->after('partner_id')->constrained('partners')->nullOnDelete(),
                    'consignee_name'             => fn() => $table->string('consignee_name', 255)->nullable()->after('consignee_partner_id'),
                    'consignee_address'          => fn() => $table->text('consignee_address')->nullable()->after('consignee_name'),
                    'consignee_country'          => fn() => $table->char('consignee_country', 2)->nullable()->after('consignee_address'),
                    'consignee_contact_person'   => fn() => $table->string('consignee_contact_person', 255)->nullable()->after('consignee_country'),
                    'consignee_phone'            => fn() => $table->string('consignee_phone', 64)->nullable()->after('consignee_contact_person'),
                    'consignee_email'            => fn() => $table->string('consignee_email', 255)->nullable()->after('consignee_phone'),
                    'consignee_registration_no'  => fn() => $table->string('consignee_registration_no', 64)->nullable()->after('consignee_email'),
                    'notify_party_name'          => fn() => $table->string('notify_party_name', 255)->nullable()->after('consignee_registration_no'),
                    'notify_party_address'       => fn() => $table->text('notify_party_address')->nullable()->after('notify_party_name'),
                    'port_of_loading'            => fn() => $table->string('port_of_loading', 128)->nullable()->after('notify_party_address'),
                    'port_of_discharge'          => fn() => $table->string('port_of_discharge', 128)->nullable()->after('port_of_loading'),
                    'loading_destination'        => fn() => $table->string('loading_destination', 255)->nullable()->after('port_of_discharge'),
                    'final_destination'          => fn() => $table->string('final_destination', 255)->nullable()->after('loading_destination'),
                    'payment_terms'              => fn() => $table->string('payment_terms', 255)->nullable()->after('final_destination'),
                    'freight_charge'             => fn() => $table->decimal('freight_charge', 18, 2)->default(0)->after('shipping'),
                    'packaging_charge'           => fn() => $table->decimal('packaging_charge', 18, 2)->default(0)->after('freight_charge'),
                    'development_charge'         => fn() => $table->decimal('development_charge', 18, 2)->default(0)->after('packaging_charge'),
                ];
                foreach ($cols as $name => $cb) {
                    if (!Schema::hasColumn('tax_invoices', $name)) $cb();
                }
            });
        }

        if (Schema::hasTable('tax_invoice_items')) {
            Schema::table('tax_invoice_items', function (Blueprint $table) {
                if (!Schema::hasColumn('tax_invoice_items', 'shipper_qty'))  $table->decimal('shipper_qty', 18, 4)->nullable()->after('qty');
                if (!Schema::hasColumn('tax_invoice_items', 'shipper_unit')) $table->string('shipper_unit', 32)->nullable()->after('shipper_qty');
            });
        }
    }

    public function down(): void
    {
        $drop = function (string $table, array $cols, array $fks = []) {
            if (!Schema::hasTable($table)) return;
            Schema::table($table, function (Blueprint $t) use ($cols, $fks, $table) {
                foreach ($fks as $col) {
                    if (Schema::hasColumn($table, $col)) $t->dropForeign([$col]);
                }
                foreach ($cols as $col) {
                    if (Schema::hasColumn($table, $col)) $t->dropColumn($col);
                }
            });
        };
        $drop('packing_lists', [
            'partner_id','invoice_date','date_of_supply','transport_mode','incoterm','lut_no','lut_date','tax_details','place_of_supply',
            'consignee_partner_id','consignee_name','consignee_address','consignee_country','consignee_contact_person','consignee_phone','consignee_email','consignee_registration_no',
            'notify_party_name','notify_party_address','port_of_loading','port_of_discharge','loading_destination','final_destination','total_pallet_qty',
        ], ['partner_id', 'consignee_partner_id']);
        $drop('packing_list_items', ['shipper_unit']);
        $drop('tax_invoices', [
            'date_of_supply','transport_mode','incoterm','lut_no','lut_date','tax_details',
            'consignee_partner_id','consignee_name','consignee_address','consignee_country','consignee_contact_person','consignee_phone','consignee_email','consignee_registration_no',
            'notify_party_name','notify_party_address','port_of_loading','port_of_discharge','loading_destination','final_destination','payment_terms',
            'freight_charge','packaging_charge','development_charge',
        ], ['consignee_partner_id']);
        $drop('tax_invoice_items', ['shipper_qty', 'shipper_unit']);
    }
};
