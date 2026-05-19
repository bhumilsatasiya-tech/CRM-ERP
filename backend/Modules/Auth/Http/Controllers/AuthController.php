<?php

namespace Modules\Auth\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Password;
use Modules\Auth\Http\Requests\ForgotPasswordRequest;
use Modules\Auth\Http\Requests\LoginRequest;
use Modules\Auth\Http\Requests\ResetPasswordRequest;
use Modules\Auth\Http\Resources\UserResource;
use Modules\Auth\Services\AuthService;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $payload = $this->authService->login($request->validated(), $request);

        return response()->json([
            'data' => [
                'user'         => new UserResource($payload['user']),
                'access_token' => $payload['access_token'],
                'token_type'   => $payload['token_type'],
                'expires_at'   => $payload['expires_at'],
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());
        return response()->json(['data' => ['message' => 'Logged out.']]);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $this->authService->logoutAllDevices($request->user());
        return response()->json(['data' => ['message' => 'Logged out from all devices.']]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $payload = $this->authService->refresh($request->user(), $request);
        return response()->json(['data' => $payload]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');
        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = $this->authService->sendPasswordResetLink($request->validated()['email']);

        $ok = $status === Password::RESET_LINK_SENT;
        return response()->json([
            'data' => [
                'status'  => $status,
                'message' => $ok
                    ? 'If the email exists, a reset link has been sent.'
                    : 'If the email exists, a reset link has been sent.',
            ],
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = $this->authService->resetPassword($request->validated());
        $ok = $status === Password::PASSWORD_RESET;

        return response()->json([
            'data' => [
                'status'  => $status,
                'message' => $ok ? 'Password reset successful.' : 'Reset failed: ' . $status,
            ],
        ], $ok ? 200 : 422);
    }
}
