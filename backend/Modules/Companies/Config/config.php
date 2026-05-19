<?php

return [
    'name' => 'Companies',

    // Header used by the frontend to indicate the active company.
    'company_header' => 'X-Company-Id',

    // Roles that can switch to ANY company (bypassing user_companies pivot).
    'all_companies_roles' => ['super-admin', 'admin'],

    // Default seeded companies — used by CompaniesSeeder.
    'seed' => [
        'company_a' => [
            'code'         => 'COA',
            'name'         => 'Company A',
            'legal_name'   => 'Company A Pvt. Ltd.',
            'type'         => 'export',
            'currency'     => 'INR',
            'is_active'    => true,
        ],
        'company_b' => [
            'code'         => 'COB',
            'name'         => 'Company B',
            'legal_name'   => 'Company B Pvt. Ltd.',
            'type'         => 'supplying',
            'currency'     => 'INR',
            'is_active'    => true,
        ],
    ],
];
