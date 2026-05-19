<?php

return [
    'name' => 'Inventory',

    'movement_types' => [
        'opening'       => 'Opening balance',
        'in'            => 'Stock In',
        'out'           => 'Stock Out',
        'transfer_in'   => 'Transfer In',
        'transfer_out'  => 'Transfer Out',
        'adjustment'    => 'Adjustment',
    ],

    'sequence_doc_types' => [
        'stock_adjustment' => ['name' => 'Stock Adjustment', 'prefix' => 'ADJ', 'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        'stock_transfer'   => ['name' => 'Stock Transfer',   'prefix' => 'TRF', 'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
    ],

    'adjustment_reasons' => [
        'physical_count'   => 'Physical count',
        'damage'           => 'Damage',
        'expiry'           => 'Expired',
        'theft'            => 'Theft / loss',
        'production_loss'  => 'Production loss',
        'opening_correction' => 'Opening balance correction',
        'other'            => 'Other',
    ],
];
