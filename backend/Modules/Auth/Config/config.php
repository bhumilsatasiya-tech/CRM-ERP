<?php

return [
    'name' => 'Auth',

    'token' => [
        'access_ttl_minutes'  => env('AUTH_ACCESS_TTL', 60 * 24),
        'refresh_ttl_minutes' => env('AUTH_REFRESH_TTL', 60 * 24 * 30),
    ],

    'password' => [
        'min_length'         => 10,
        'require_mixed_case' => true,
        'require_number'     => true,
        'require_symbol'     => true,
        'history_count'      => 5,
    ],

    'lockout' => [
        'max_attempts'    => 5,
        'decay_minutes'   => 15,
    ],

    'two_factor' => [
        'enabled' => env('AUTH_2FA_ENABLED', false),
    ],

    'super_admin_role' => 'super-admin',
];
