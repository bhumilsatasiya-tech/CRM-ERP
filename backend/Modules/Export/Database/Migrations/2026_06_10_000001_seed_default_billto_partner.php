<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private const CODE  = 'BILLTO-ORDER';
    private const NAME  = 'Z TO ORDER AND NA';

    public function up(): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('partners')) return;
        if (!\Illuminate\Support\Facades\Schema::hasTable('companies')) return;

        $companies = DB::table('companies')->whereNull('deleted_at')->get(['id']);
        $now = now();
        foreach ($companies as $c) {
            $exists = DB::table('partners')
                ->where('company_id', $c->id)
                ->where('code', self::CODE)
                ->exists();
            if ($exists) continue;

            DB::table('partners')->insert([
                'company_id'           => $c->id,
                'code'                 => self::CODE,
                'name'                 => self::NAME,
                'type'                 => 'client',
                'is_company'           => 1,
                'segment'              => 'b2b',
                'country'              => 'IN',
                'tax_treatment'        => 'unregistered',
                'currency'             => 'USD',
                'credit_limit'         => 0,
                'credit_days'          => 0,
                'opening_balance'      => 0,
                'opening_balance_type' => 'debit',
                'default_payment_terms_days' => 0,
                'is_active'            => 1,
                'is_blacklisted'       => 0,
                'notes'                => 'System-seeded default Bill To for export invoices (To Order, no actual buyer name on the invoice — typical under L/C).',
                'created_at'           => $now,
                'updated_at'           => $now,
            ]);
        }
    }

    public function down(): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('partners')) return;
        DB::table('partners')->where('code', self::CODE)->delete();
    }
};
