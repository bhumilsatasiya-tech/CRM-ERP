<?php

namespace Modules\Security\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Security\Models\ModuleLock;
use Modules\Security\Services\SecurityService;
use RuntimeException;

class SecurityController extends Controller
{
    public function __construct(private SecurityService $service) {}

    private function companyId(): int
    {
        return app()->bound('active_company_id') ? (int) app('active_company_id') : 0;
    }

    /* ============================================================ Master toggle (per-company) */

    public function master(Request $request): JsonResponse
    {
        $cid = $this->companyId();
        return response()->json(['data' => [
            'is_enabled' => $this->service->isMasterEnabled($cid),
            'can_manage' => (bool) $request->user()?->can('security.lock.manage'),
        ]]);
    }

    public function setMaster(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.lock.manage'), 403);
        $data = $request->validate(['is_enabled' => ['required', 'boolean']]);
        $this->service->setMasterEnabled($this->companyId(), (bool) $data['is_enabled']);
        return response()->json(['data' => ['is_enabled' => (bool) $data['is_enabled']]]);
    }

    /* ============================================================ Module locks (admin) */

    public function locks(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.lock.manage'), 403);
        return response()->json(['data' => $this->service->locksFor($this->companyId())]);
    }

    public function setLock(Request $request, string $moduleKey): JsonResponse
    {
        abort_unless($request->user()?->can('security.lock.manage'), 403);
        $data = $request->validate([
            'is_enabled'     => ['required', 'boolean'],
            'unlock_minutes' => ['nullable', 'integer', 'min:5', 'max:240'],
        ]);
        try {
            $out = $this->service->setLock(
                $this->companyId(), $moduleKey,
                (bool) $data['is_enabled'],
                $data['unlock_minutes'] ?? null,
                $request->user()?->id
            );
            return response()->json(['data' => $out]);
        } catch (RuntimeException $e) {
            abort(422, $e->getMessage());
        }
    }

    /* ============================================================ PIN (own) */

    public function pinStatus(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->pinStatus($request->user())]);
    }

    public function setPin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pin'         => ['required', 'string', 'regex:/^\d{4,8}$/'],
            'current_pin' => ['nullable', 'string'],   // required when a PIN already exists (verify before change)
        ]);
        $user = $request->user();
        $status = $this->service->pinStatus($user);
        if ($status['has_pin']) {
            // Verify current PIN before allowing change
            if (empty($data['current_pin']) || ! $this->service->verifyPin($user, $data['current_pin'])) {
                abort(403, 'Current PIN is required and must be correct to change PIN.');
            }
        }
        try {
            $this->service->setPin($user, $data['pin']);
            return response()->json(['data' => ['message' => 'PIN saved.']]);
        } catch (RuntimeException $e) {
            abort(422, $e->getMessage());
        }
    }

    public function removePin(Request $request): JsonResponse
    {
        $data = $request->validate(['current_pin' => ['required', 'string']]);
        try {
            if (! $this->service->verifyPin($request->user(), $data['current_pin'])) {
                abort(403, 'Wrong PIN.');
            }
        } catch (RuntimeException $e) {
            abort(403, $e->getMessage());
        }
        $this->service->removePin($request->user());
        return response()->json(['data' => ['message' => 'PIN removed.']]);
    }

    /* ============================================================ Unlock (per module) */

    public function unlock(Request $request, string $moduleKey): JsonResponse
    {
        if (! in_array($moduleKey, ModuleLock::KEYS, true)) abort(404);

        $companyId = $this->companyId();
        if (! $this->service->isLocked($companyId, $moduleKey)) {
            // Module isn't locked → no PIN needed → just return success.
            return response()->json(['data' => ['module_key' => $moduleKey, 'is_unlocked' => true, 'unlocked_until' => null, 'minutes' => 0]]);
        }

        $data = $request->validate(['pin' => ['required', 'string']]);
        try {
            if (! $this->service->verifyPin($request->user(), $data['pin'])) {
                $status = $this->service->pinStatus($request->user());
                abort(403, "Wrong PIN. Attempts: {$status['failed_attempts']} / 3.");
            }
        } catch (RuntimeException $e) {
            abort(403, $e->getMessage());
        }

        $out = $this->service->createUnlock($request->user()->id, $companyId, $moduleKey);
        return response()->json(['data' => $out + ['is_unlocked' => true]]);
    }

    public function unlockStatus(Request $request, string $moduleKey): JsonResponse
    {
        if (! in_array($moduleKey, ModuleLock::KEYS, true)) abort(404);
        $isLocked   = $this->service->isLocked($this->companyId(), $moduleKey);
        $isUnlocked = $this->service->isUnlocked($request->user()->id, $moduleKey);
        $status     = $this->service->unlockStatus($request->user()->id, $moduleKey);
        return response()->json(['data' => array_merge($status, [
            'requires_pin'   => $isLocked && ! $isUnlocked,
            'is_locked'      => $isLocked,
            'is_unlocked'    => $isUnlocked,
        ])]);
    }

    public function clearUnlock(Request $request, string $moduleKey): JsonResponse
    {
        if (! in_array($moduleKey, ModuleLock::KEYS, true)) abort(404);
        $this->service->clearUnlock($request->user()->id, $moduleKey);
        return response()->json(['data' => ['message' => 'Unlock session cleared.']]);
    }
}
