<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Always return JSON 401 for unauthenticated requests — we're an API-only app
     * and don't have a `login` named route. Without this override, Laravel's
     * default falls back to `redirect()->guest(route('login'))` which throws
     * RouteNotFoundException → surfaces as a slow HTTP 500 to the user.
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        return response()->json([
            'message' => $exception->getMessage(),
        ], 401);
    }

    /** Silence the unused-import warning. */
    private function _unused(Request $r): void { unset($r); }
}
