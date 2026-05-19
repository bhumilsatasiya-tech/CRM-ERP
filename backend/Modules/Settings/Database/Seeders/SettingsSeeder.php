<?php

namespace Modules\Settings\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Settings\Models\Sequence;
use Modules\Settings\Models\Setting;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        // 1) Default global settings (idempotent — won't overwrite existing values)
        foreach ((array) config('settings.defaults', []) as $row) {
            Setting::firstOrCreate(
                [
                    'scope'    => $row['scope'],
                    'scope_id' => $row['scope_id'] ?? null,
                    'key'      => $row['key'],
                ],
                [
                    'group'       => $row['group'] ?? 'general',
                    'value'       => $row['value'] ?? null,
                    'type'        => $row['type'] ?? 'string',
                    'label'       => $row['label'] ?? null,
                    'description' => $row['description'] ?? null,
                    'options'     => $row['options'] ?? null,
                    'is_public'   => $row['is_public'] ?? false,
                    'is_system'   => $row['is_system'] ?? true,
                ]
            );
        }

        // 2) Default sequences for every company
        $templates = (array) config('settings.sequence_templates', []);
        foreach (Company::all() as $company) {
            foreach ($templates as $tpl) {
                Sequence::firstOrCreate(
                    ['company_id' => $company->id, 'doc_type' => $tpl['doc_type']],
                    array_merge($tpl, [
                        'is_active'      => true,
                        'current_number' => 0,
                    ])
                );
            }
        }
    }
}
