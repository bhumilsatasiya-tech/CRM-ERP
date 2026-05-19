<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('export_invoices')) {
            Schema::table('export_invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('export_invoices', 'date_of_supply'))           $table->date('date_of_supply')->nullable()->after('invoice_date');
                if (!Schema::hasColumn('export_invoices', 'transport_mode'))           $table->enum('transport_mode', ['air','sea','road','rail','multimodal','other'])->nullable()->after('incoterm');
                if (!Schema::hasColumn('export_invoices', 'lut_no'))                   $table->string('lut_no', 64)->nullable()->after('transport_mode');
                if (!Schema::hasColumn('export_invoices', 'lut_date'))                 $table->date('lut_date')->nullable()->after('lut_no');
                if (!Schema::hasColumn('export_invoices', 'tax_details'))              $table->string('tax_details', 255)->nullable()->after('lut_date');

                if (!Schema::hasColumn('export_invoices', 'consignee_partner_id'))     $table->foreignId('consignee_partner_id')->nullable()->after('partner_id')->constrained('partners')->nullOnDelete();
                if (!Schema::hasColumn('export_invoices', 'consignee_name'))           $table->string('consignee_name', 255)->nullable()->after('consignee_partner_id');
                if (!Schema::hasColumn('export_invoices', 'consignee_address'))        $table->text('consignee_address')->nullable()->after('consignee_name');
                if (!Schema::hasColumn('export_invoices', 'consignee_country'))        $table->char('consignee_country', 2)->nullable()->after('consignee_address');
                if (!Schema::hasColumn('export_invoices', 'consignee_contact_person')) $table->string('consignee_contact_person', 255)->nullable()->after('consignee_country');
                if (!Schema::hasColumn('export_invoices', 'consignee_phone'))          $table->string('consignee_phone', 64)->nullable()->after('consignee_contact_person');
                if (!Schema::hasColumn('export_invoices', 'consignee_email'))          $table->string('consignee_email', 255)->nullable()->after('consignee_phone');
                if (!Schema::hasColumn('export_invoices', 'consignee_registration_no'))$table->string('consignee_registration_no', 64)->nullable()->after('consignee_email');

                if (!Schema::hasColumn('export_invoices', 'notify_party_name'))        $table->string('notify_party_name', 255)->nullable()->after('consignee_registration_no');
                if (!Schema::hasColumn('export_invoices', 'notify_party_address'))     $table->text('notify_party_address')->nullable()->after('notify_party_name');

                if (!Schema::hasColumn('export_invoices', 'loading_destination'))      $table->string('loading_destination', 255)->nullable()->after('port_of_discharge');
                if (!Schema::hasColumn('export_invoices', 'final_destination'))        $table->string('final_destination', 255)->nullable()->after('loading_destination');
                if (!Schema::hasColumn('export_invoices', 'payment_terms'))            $table->string('payment_terms', 255)->nullable()->after('final_destination');

                if (!Schema::hasColumn('export_invoices', 'freight_charge'))           $table->decimal('freight_charge', 18, 2)->default(0)->after('shipping');
                if (!Schema::hasColumn('export_invoices', 'packaging_charge'))         $table->decimal('packaging_charge', 18, 2)->default(0)->after('freight_charge');
                if (!Schema::hasColumn('export_invoices', 'development_charge'))       $table->decimal('development_charge', 18, 2)->default(0)->after('packaging_charge');
            });
        }

        if (Schema::hasTable('export_invoice_items')) {
            Schema::table('export_invoice_items', function (Blueprint $table) {
                if (!Schema::hasColumn('export_invoice_items', 'shipper_qty'))  $table->decimal('shipper_qty', 18, 4)->nullable()->after('qty');
                if (!Schema::hasColumn('export_invoice_items', 'shipper_unit')) $table->string('shipper_unit', 32)->nullable()->after('shipper_qty');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('export_invoices')) {
            Schema::table('export_invoices', function (Blueprint $table) {
                foreach ([
                    'date_of_supply','transport_mode','lut_no','lut_date','tax_details',
                    'consignee_name','consignee_address','consignee_country','consignee_contact_person',
                    'consignee_phone','consignee_email','consignee_registration_no',
                    'notify_party_name','notify_party_address',
                    'loading_destination','final_destination','payment_terms',
                    'freight_charge','packaging_charge','development_charge',
                ] as $col) {
                    if (Schema::hasColumn('export_invoices', $col)) $table->dropColumn($col);
                }
                if (Schema::hasColumn('export_invoices', 'consignee_partner_id')) {
                    $table->dropForeign(['consignee_partner_id']);
                    $table->dropColumn('consignee_partner_id');
                }
            });
        }
        if (Schema::hasTable('export_invoice_items')) {
            Schema::table('export_invoice_items', function (Blueprint $table) {
                foreach (['shipper_qty','shipper_unit'] as $col) {
                    if (Schema::hasColumn('export_invoice_items', $col)) $table->dropColumn($col);
                }
            });
        }
    }
};
