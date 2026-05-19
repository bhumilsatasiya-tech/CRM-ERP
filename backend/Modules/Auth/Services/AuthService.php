<?php

namespace Modules\Auth\Services;

use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Modules\Auth\Models\User;

class AuthService
{
    public function login(array $credentials, Request $request): array
    {
        $email      = (string) ($credentials['email'] ?? '');
        $password   = (string) ($credentials['password'] ?? '');
        $deviceName = (string) ($credentials['device_name'] ?? $request->userAgent() ?? 'unknown');

        $throttleKey = $this->throttleKey($email, $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, config('auth_module.lockout.max_attempts', 5))) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Try again in {$seconds} seconds."],
            ]);
        }

        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            RateLimiter::hit($throttleKey, config('auth_module.lockout.decay_minutes', 15) * 60);
            $this->incrementFailedAttempts($user);
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account is disabled. Contact your administrator.'],
            ]);
        }

        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'email' => ['This account is temporarily locked. Try again later.'],
            ]);
        }

        RateLimiter::clear($throttleKey);

        DB::transaction(function () use ($user, $request) {
            $user->forceFill([
                'last_login_at'         => now(),
                'last_login_ip'         => $request->ip(),
                'failed_login_attempts' => 0,
                'locked_until'          => null,
            ])->save();
        });

        $expiresAt = now()->addMinutes(config('auth_module.token.access_ttl_minutes', 60 * 24));
        $token = $user->createToken($deviceName, ['*']);

        return [
            'user'         => $user->load('roles'),
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $expiresAt->toIso8601String(),
        ];
    }

    public function logout(User $user, ?string $tokenId = null): void
    {
        if ($tokenId) {
            $user->tokens()->where('id', $tokenId)->delete();
            return;
        }
        $user->currentAccessToken()?->delete();
    }

    public function logoutAllDevices(User $user): void
    {
        $user->tokens()->delete();
    }

    public function refresh(User $user, Request $request): array
    {
        $current = $user->currentAccessToken();
        $deviceName = $current?->name ?? ($request->userAgent() ?? 'unknown');
        $current?->delete();

        $expiresAt = now()->addMinutes(config('auth_module.token.access_ttl_minutes', 60 * 24));
        $token = $user->createToken($deviceName, ['*']);

        return [
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $expiresAt->toIso8601String(),
        ];
    }

    public function sendPasswordResetLink(string $email): string
    {
        $status = Password::sendResetLink(['email' => $email]);
        return (string) $status;
    }

    public function resetPassword(array $data): string
    {
        $status = Password::reset(
            $data,
            function (User $user, string $password) {
                $user->forceFill([
                    'password'             => Hash::make($password),
                    'remember_token'       => Str::random(60),
                    'password_changed_at'  => now(),
                    'must_change_password' => false,
                    'failed_login_attempts'=> 0,
                    'locked_until'         => null,
                ])->save();

                $user->tokens()->delete();
                event(new PasswordReset($user));
            }
        );
        return (string) $status;
    }

    private function throttleKey(string $email, ?string $ip): string
    {
        return Str::lower($email) . '|' . ($ip ?? 'unknown');
    }

    private function incrementFailedAttempts(?User $user): void
    {
        if (! $user) return;

        $user->increment('failed_login_attempts');

        $max = config('auth_module.lockout.max_attempts', 5);
        if ($user->failed_login_attempts >= $max) {
            $user->forceFill([
                'locked_until' => now()->addMinutes(config('auth_module.lockout.decay_minutes', 15)),
            ])->save();
        }
    }
}
