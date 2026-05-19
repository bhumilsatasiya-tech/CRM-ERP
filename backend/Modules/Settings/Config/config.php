<?php

return [
    'name' => 'Settings',

    // Default settings seeded for fresh installs.
    // 'scope' = global | company | user
    // 'type'  = string | int | bool | json | select
    'defaults' => [
        ['scope' => 'global', 'group' => 'general',   'key' => 'app_locale',           'value' => 'en',         'type' => 'select', 'options' => [['value'=>'en','label'=>'English'],['value'=>'hi','label'=>'Hindi']], 'label' => 'Default locale',     'is_public' => true],
        ['scope' => 'global', 'group' => 'general',   'key' => 'date_format',          'value' => 'DD/MM/YYYY', 'type' => 'string',                                                                                'label' => 'Date format',        'is_public' => true],
        ['scope' => 'global', 'group' => 'general',   'key' => 'time_format',          'value' => '24h',        'type' => 'select', 'options' => [['value'=>'12h','label'=>'12h'],['value'=>'24h','label'=>'24h']], 'label' => 'Time format',        'is_public' => true],

        ['scope' => 'global', 'group' => 'finance',   'key' => 'default_currency',     'value' => 'INR',        'type' => 'string', 'label' => 'Default currency'],
        ['scope' => 'global', 'group' => 'finance',   'key' => 'tax_inclusive',        'value' => false,        'type' => 'bool',   'label' => 'Prices include tax by default'],
        ['scope' => 'global', 'group' => 'finance',   'key' => 'default_payment_terms_days', 'value' => 30,     'type' => 'int',    'label' => 'Default payment terms (days)'],

        ['scope' => 'global', 'group' => 'documents', 'key' => 'invoice_footer',       'value' => 'Thank you for your business.', 'type' => 'string', 'label' => 'Invoice footer text'],
        ['scope' => 'global', 'group' => 'documents', 'key' => 'pdf_logo_max_height',  'value' => 80,           'type' => 'int',    'label' => 'PDF logo max height (px)'],

        ['scope' => 'global', 'group' => 'mail',      'key' => 'send_quotation_email_default',  'value' => true,  'type' => 'bool', 'label' => 'Send quotation by email by default'],
        ['scope' => 'global', 'group' => 'mail',      'key' => 'send_invoice_email_default',    'value' => true,  'type' => 'bool', 'label' => 'Send invoice by email by default'],
    ],

    // Default sequences seeded for every company.
    'sequence_templates' => [
        ['doc_type' => 'quotation',       'name' => 'Quotation',       'prefix' => 'QT',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'sales_order',     'name' => 'Sales Order',     'prefix' => 'SO',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'invoice',         'name' => 'Invoice',         'prefix' => 'INV',  'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'credit_note',     'name' => 'Credit Note',     'prefix' => 'CN',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'purchase_order',  'name' => 'Purchase Order',  'prefix' => 'PO',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'grn',             'name' => 'GRN',             'prefix' => 'GRN',  'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'purchase_invoice','name' => 'Purchase Invoice','prefix' => 'PI',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'batch',           'name' => 'Production Batch','prefix' => 'BT',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'shipping_bill',   'name' => 'Shipping Bill',   'prefix' => 'SB',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'export_invoice',  'name' => 'Export Invoice',  'prefix' => 'EI',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'packing_list',    'name' => 'Packing List',    'prefix' => 'PL',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'tax_invoice',     'name' => 'Tax Invoice',     'prefix' => 'TI',   'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'inter_company_invoice', 'name' => 'Inter-Company Invoice', 'prefix' => 'ICI', 'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'lodgement',           'name' => 'Export Lodgement',     'prefix' => 'LODGE','format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
        ['doc_type' => 'project',             'name' => 'Project',              'prefix' => 'PROJ', 'format' => '{prefix}/{year}/{number}', 'padding' => 5, 'reset_period' => 'yearly'],
    ],

    // Cache TTL for resolved settings (seconds). Cleared on write.
    'cache_ttl' => 3600,
];
