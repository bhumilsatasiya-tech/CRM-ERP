<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * API-only app — there is no `login` named route. Always return null so Laravel
     * responds with a clean JSON 401 instead of trying to redirect and throwing
     * RouteNotFoundException (which surfaces as a slow HTTP 500).
     *
     * The frontend's axios response interceptor already handles 401s
     * (auto-refresh → re-login flow) — no server-side redirect needed.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        return null;
    }
}
