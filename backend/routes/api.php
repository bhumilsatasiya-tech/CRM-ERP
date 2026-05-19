<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/v1/health', function () {
    $checks = ['app' => true, 'db' => false, 'cache' => false];

    try { DB::select('SELECT 1'); $checks['db'] = true; } catch (\Throwable $e) {}
    try {
        Cache::put('_healthcheck', '1', 5);
        $checks['cache'] = Cache::get('_healthcheck') === '1';
    } catch (\Throwable $e) {}

    $ok = ! in_array(false, $checks, true);

    return response()->json([
        'ok' => $ok,
        'checks' => $checks,
        'version' => config('app.name'),
        'env' => config('app.env'),
        'timestamp' => now()->toIso8601String(),
    ], $ok ? 200 : 503);
});
