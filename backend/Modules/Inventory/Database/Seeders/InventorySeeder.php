<?php

namespace Modules\Inventory\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Settings\Models\Sequence;

class InventorySeeder extends Seeder
{
    /**
     * Add doc-type sequences for stock adjustment + transfer to every company.
     * (The base settings module only seeds quotation/SO/INV/PO/etc.)
     */
    public function run(): void
    {
        $templates = (array) config('inventory.sequence_doc_types', []);
        foreach (Company::all() as $company) {
            foreach ($templates as $docType => $tpl) {
                Sequence::firstOrCreate(
                    ['company_id' => $company->id, 'doc_type' => $docType],
                    array_merge($tpl, [
                        'doc_type'       => $docType,
                        'is_active'      => true,
                        'current_number' => 0,
                    ])
                );
            }
        }
    }
}
