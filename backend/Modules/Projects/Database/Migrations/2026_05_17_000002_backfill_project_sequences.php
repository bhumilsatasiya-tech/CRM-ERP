<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Backfill: every existing company needs a `project` sequence row so the
 * Project Costing module can auto-number new projects. New companies get this
 * automatically via SettingsSeeder (which reads from settings.sequence_templates).
 */
return new class extends Migration {
    public function up(): void
    {
        $companies = DB::table('companies')->whereNull('deleted_at')->pluck('id');
        foreach ($companies as $companyId) {
            DB::table('sequences')->updateOrInsert(
                ['company_id' => $companyId, 'doc_type' => 'project'],
                [
                    'name'           => 'Project',
                    'prefix'         => 'PROJ',
                    'suffix'         => '',
                    'format'         => '{prefix}/{year}/{number}',
                    'padding'        => 5,
                    'current_number' => 0,
                    'reset_period'   => 'yearly',
                    'last_reset_at'  => null,
                    'is_active'      => true,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        DB::table('sequences')->where('doc_type', 'project')->delete();
    }
};
