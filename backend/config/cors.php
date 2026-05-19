<?php

/*
| CORS configuration. In production set CORS_ALLOWED_ORIGINS in .env to a
| comma-separated list of full origins (scheme + host), e.g.
|   CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
|
| Leaving the env unset falls back to '*' which is OK for local dev only.
| Bearer-token auth (the app's default) does not require supports_credentials.
*/

$envOrigins = env('CORS_ALLOWED_ORIGINS');
$allowedOrigins = $envOrigins
    ? array_values(array_filter(array_map('trim', explode(',', $envOrigins))))
    : ['*'];

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Authorization'],

    'max_age' => 86400,

    'supports_credentials' => (bool) env('CORS_SUPPORTS_CREDENTIALS', false),

];
