<?php

return [
    'name' => 'Production',

    // Status enum mirror (single source for FE/BE alignment if read).
    'statuses' => [
        'draft'       => 'Draft',
        'submitted'   => 'Submitted',
        'approved'    => 'Approved',
        'in_progress' => 'In Progress',
        'completed'   => 'Completed',
        'cancelled'   => 'Cancelled',
    ],

    'output_types' => [
        'finished'   => 'Finished Goods',
        'by_product' => 'By-Product',
        'scrap'      => 'Scrap',
    ],

    // The 'batch' sequence (prefix BT) is already seeded by Settings module.
    // No additional sequence_doc_types are needed here.
];
