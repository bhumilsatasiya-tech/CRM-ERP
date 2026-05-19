<?php

return [
    'name' => 'Products',

    'types' => [
        'raw'         => 'Raw material',
        'finished'    => 'Finished good',
        'packaging'   => 'Packaging',
        'consumable'  => 'Consumable',
        'service'     => 'Service',
        'other'       => 'Other',
    ],

    'unit_types' => [
        'weight' => 'Weight',
        'volume' => 'Volume',
        'count'  => 'Count',
        'length' => 'Length',
        'area'   => 'Area',
        'time'   => 'Time',
        'other'  => 'Other',
    ],

    // Default units seeded for every fresh company.
    'default_units' => [
        ['code' => 'kg',    'name' => 'Kilogram', 'symbol' => 'kg',  'type' => 'weight', 'is_base' => true,  'conversion_factor' => 1,       'decimals_allowed' => 3],
        ['code' => 'g',     'name' => 'Gram',     'symbol' => 'g',   'type' => 'weight', 'is_base' => false, 'conversion_factor' => 0.001,   'decimals_allowed' => 3],
        ['code' => 'mg',    'name' => 'Milligram','symbol' => 'mg',  'type' => 'weight', 'is_base' => false, 'conversion_factor' => 0.000001,'decimals_allowed' => 3],
        ['code' => 'L',     'name' => 'Litre',    'symbol' => 'L',   'type' => 'volume', 'is_base' => true,  'conversion_factor' => 1,       'decimals_allowed' => 3],
        ['code' => 'ml',    'name' => 'Millilitre','symbol' => 'ml', 'type' => 'volume', 'is_base' => false, 'conversion_factor' => 0.001,   'decimals_allowed' => 3],
        ['code' => 'pcs',   'name' => 'Pieces',   'symbol' => 'pcs', 'type' => 'count',  'is_base' => true,  'conversion_factor' => 1,       'decimals_allowed' => 0],
        ['code' => 'dozen', 'name' => 'Dozen',    'symbol' => 'dz',  'type' => 'count',  'is_base' => false, 'conversion_factor' => 12,      'decimals_allowed' => 0],
        ['code' => 'box',   'name' => 'Box',      'symbol' => 'box', 'type' => 'count',  'is_base' => false, 'conversion_factor' => 1,       'decimals_allowed' => 0],
        ['code' => 'bag',   'name' => 'Bag',      'symbol' => 'bag', 'type' => 'count',  'is_base' => false, 'conversion_factor' => 1,       'decimals_allowed' => 0],
        ['code' => 'drum',  'name' => 'Drum',     'symbol' => 'drm', 'type' => 'count',  'is_base' => false, 'conversion_factor' => 1,       'decimals_allowed' => 0],
        ['code' => 'm',     'name' => 'Metre',    'symbol' => 'm',   'type' => 'length', 'is_base' => true,  'conversion_factor' => 1,       'decimals_allowed' => 3],
        ['code' => 'cm',    'name' => 'Centimetre','symbol' => 'cm', 'type' => 'length', 'is_base' => false, 'conversion_factor' => 0.01,    'decimals_allowed' => 2],
    ],

    'default_categories' => [
        ['code' => 'GEN', 'name' => 'General', 'description' => 'Default category. Reorganize as you grow.'],
    ],
];
