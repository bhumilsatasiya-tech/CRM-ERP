<?php

return [
    'name' => 'Crm',

    // Sequence doc_type used to auto-number partner codes if user doesn't provide one.
    // (Optional — partners can also accept a manually entered code.)
    'partner_code_sequence' => 'partner',

    'types' => [
        'client'       => 'Client',
        'supplier'     => 'Supplier',
        'manufacturer' => 'Manufacturer',
        'employee'     => 'Employee (vendor)',
        'other'        => 'Other',
    ],

    'tax_treatments' => [
        'registered'   => 'Registered',
        'unregistered' => 'Unregistered',
        'composition'  => 'Composition',
        'sez'          => 'SEZ',
        'overseas'     => 'Overseas',
    ],

    'segments' => [
        'b2b'         => 'B2B',
        'b2c'         => 'B2C',
        'distributor' => 'Distributor',
        'oem'         => 'OEM',
        'other'       => 'Other',
    ],

    'address_types' => [
        'billing'    => 'Billing',
        'shipping'   => 'Shipping',
        'registered' => 'Registered',
        'branch'     => 'Branch',
    ],
];
