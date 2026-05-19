<?php

namespace Modules\Security\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Modules\Auth\Models\User;
use Modules\Security\Models\ModuleLock;
use Modules\Security\Models\UserPin;
use Modules\Settings\Services\SettingService;
use RuntimeException;

/**
 * Security service for the per-module PIN lock system.
 *
 * Concepts:
 *  - ModuleLock      → company-level toggle. When ON for a module, PIN entry is required.
 *  - UserPin         → per-user hashed PIN. Set once, then used to unlock locked modules.
 *  - Unlock session  → cache entry (TTL = ModuleLock.unlock_minutes). While valid, no re-prompt.
 *
 * Flow:
 *   isLocked(module, company) → true/false
 *   isUnlocked(user, module)  → checks cache for an active unlock session
 *   verifyPin(user, pin)      → bcrypt check + attempt counter + lockout after 3 failures
 *   createUnlock(user, module)→ writes a cache entry with the configured TTL
 */
class SecurityService
{
    private const MAX_ATTEMPTS    = 3;
    private const LOCKOUT_MINUTES = 10;
    private const MASTER_KEY      = 'security.pin_lock_enabled';

    public function __construct(private SettingService $settings) {}

    /* ============================================================ Master toggle (per-company) */

    /**
     * Master on/off for the entire PIN-lock system, per company.
     * When OFF, every isLocked() returns false → no PIN ever required → the
     * Settings page hides the PIN setter + module multi-select.
     */
    public function isMasterEnabled(int $companyId): bool
    {
        $val = $this->settings->get(self::MASTER_KEY, '0', null, $companyId);
        return (string) $val === '1' || $val === true || $val === 1;
    }

    public function setMasterEnabled(int $companyId, bool $enabled): void
    {
        $this->settings->set('company', $companyId, self::MASTER_KEY, $enabled ? '1' : '0');
    }

    /* ============================================================ Locks (company-wide) */

    public function locksFor(int $companyId): array
    {
        $out = [];
        foreach (ModuleLock::KEYS as $key) {
            $row = ModuleLock::firstOrCreate(
                ['company_id' => $companyId, 'module_key' => $key],
                ['is_enabled' => false, 'unlock_minutes' => 30]
            );
            $out[] = [
                'module_key'     => $row->module_key,
                'is_enabled'     => (bool) $row->is_enabled,
                'unlock_minutes' => (int) $row->unlock_minutes,
                'notes'          => $row->notes,
                'updated_at'     => $row->updated_at?->toIso8601String(),
            ];
        }
        return $out;
    }

    public function setLock(int $companyId, string $moduleKey, bool $enabled, ?int $unlockMinutes, ?int $actorId): array
    {
        if (! in_array($moduleKey, ModuleLock::KEYS, true)) {
            throw new RuntimeException("Unknown module: {$moduleKey}");
        }
        $row = ModuleLock::updateOrCreate(
            ['company_id' => $companyId, 'module_key' => $moduleKey],
            [
                'is_enabled'     => $enabled,
                'unlock_minutes' => $unlockMinutes ?? 30,
                'updated_by'     => $actorId,
            ]
        );
        return [
            'module_key'     => $row->module_key,
            'is_enabled'     => (bool) $row->is_enabled,
            'unlock_minutes' => (int) $row->unlock_minutes,
        ];
    }

    public function isLocked(int $companyId, string $moduleKey): bool
    {
        // Master toggle short-circuit — if the company turned PIN security OFF,
        // ignore individual module toggles entirely.
        if (! $this->isMasterEnabled($companyId)) return false;

        return ModuleLock::where('company_id', $companyId)
            ->where('module_key', $moduleKey)
            ->where('is_enabled', true)
            ->exists();
    }

    public function unlockMinutesFor(int $companyId, string $moduleKey): int
    {
        return (int) (ModuleLock::where('company_id', $companyId)
            ->where('module_key', $moduleKey)
            ->value('unlock_minutes') ?? 30);
    }

    /* ============================================================ PIN (per-user) */

    public function pinStatus(User $user): array
    {
        $pin = UserPin::where('user_id', $user->id)->first();
        return [
            'has_pin'         => $pin !== null,
            'failed_attempts' => $pin?->failed_attempts ?? 0,
            'locked_until'    => $pin?->locked_until?->toIso8601String(),
            'last_unlock_at'  => $pin?->last_unlock_at?->toIso8601String(),
            'is_locked_out'   => $pin && $pin->locked_until && $pin->locked_until->isFuture(),
        ];
    }

    public function setPin(User $user, string $pin): void
    {
        if (! preg_match('/^\d{4,8}$/', $pin)) {
            throw new RuntimeException('PIN must be 4-8 digits.');
        }
        UserPin::updateOrCreate(
            ['user_id' => $user->id],
            [
                'pin_hash'        => Hash::make($pin),
                'failed_attempts' => 0,
                'locked_until'    => null,
            ]
        );
    }

    public function removePin(User $user): void
    {
        UserPin::where('user_id', $user->id)->delete();
        // Also drop every active unlock session for this user
        foreach (ModuleLock::KEYS as $key) {
            Cache::forget($this->unlockCacheKey($user->id, $key));
        }
    }

    /**
     * Returns true on correct PIN. Tracks failures + applies lockout.
     * Throws RuntimeException if user is currently locked out.
     */
    public function verifyPin(User $user, string $pin): bool
    {
        $row = UserPin::where('user_id', $user->id)->first();
        if (! $row) throw new RuntimeException('No PIN set. Please set a PIN first.');
        if ($row->locked_until && $row->locked_until->isFuture()) {
            $mins = (int) ceil(now()->diffInSeconds($row->locked_until) / 60);
            throw new RuntimeException("Too many wrong PINs. Try again in {$mins} minutes.");
        }
        if (Hash::check($pin, $row->pin_hash)) {
            $row->failed_attempts = 0;
            $row->locked_until    = null;
            $row->last_unlock_at  = now();
            $row->save();
            return true;
        }
        $row->failed_attempts++;
        if ($row->failed_attempts >= self::MAX_ATTEMPTS) {
            $row->locked_until = now()->addMinutes(self::LOCKOUT_MINUTES);
        }
        $row->save();
        return false;
    }

    /* ============================================================ Unlock sessions (cache) */

    public function isUnlocked(int $userId, string $moduleKey): bool
    {
        return Cache::has($this->unlockCacheKey($userId, $moduleKey));
    }

    public function createUnlock(int $userId, int $companyId, string $moduleKey): array
    {
        $minutes = $this->unlockMinutesFor($companyId, $moduleKey);
        $until   = now()->addMinutes($minutes);
        Cache::put($this->unlockCacheKey($userId, $moduleKey), $until->toIso8601String(), $minutes * 60);
        return ['module_key' => $moduleKey, 'unlocked_until' => $until->toIso8601String(), 'minutes' => $minutes];
    }

    public function clearUnlock(int $userId, string $moduleKey): void
    {
        Cache::forget($this->unlockCacheKey($userId, $moduleKey));
    }

    public function unlockStatus(int $userId, string $moduleKey): array
    {
        $key = $this->unlockCacheKey($userId, $moduleKey);
        $until = Cache::get($key);
        return [
            'module_key'    => $moduleKey,
            'is_unlocked'   => $until !== null,
            'unlocked_until'=> $until,
        ];
    }

    private function unlockCacheKey(int $userId, string $moduleKey): string
    {
        return "security:unlock:{$userId}:{$moduleKey}";
    }
}
