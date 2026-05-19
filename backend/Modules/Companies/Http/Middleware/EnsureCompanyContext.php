<?php

namespace Modules\Companies\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Companies\Models\Company;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyContext
{
    /**
     * Resolves the active company for the request:
     *   1. X-Company-Id header (frontend switcher)
     *   2. user.default_company_id
     *   3. user's first assigned ACTIVE company
     *
     * If a candidate is dead (inactive / soft-deleted / no access), we silently fall through
     * to the next candidate instead of throwing 404 — that pattern locks the UI when the
     * cached id in the browser points at a deleted company.
     *
     * Once we resolve a usable id, we auto-heal user.default_company_id if it was stale.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $headerName  = config('companies.company_header', 'X-Company-Id');
        $bypassRoles = config('companies.all_companies_roles', ['super-admin']);
        $hasBypass   = method_exists($user, 'hasAnyRole') && $user->hasAnyRole($bypassRoles);

        // Build an ordered list of candidates: header → user.default → first available.
        $candidates = [];
        if ($hdr = (int) $request->header($headerName)) $candidates[] = $hdr;
        if ($user->default_company_id) $candidates[] = (int) $user->default_company_id;

        $resolved = null;
        foreach ($candidates as $cid) {
            if ($cid <= 0) continue;
            if ($this->candidateUsable($cid, $user, $hasBypass)) { $resolved = $cid; break; }
        }

        if ($resolved === null) {
            // Walk the user's available active companies in order.
            $list = $hasBypass
                ? Company::query()->where('is_active', true)->orderBy('id')->pluck('id')
                : $user->companies()->where('is_active', true)->orderBy('companies.id')->pluck('companies.id');
            $resolved = $list->first();
        }

        if ($resolved === null) {
            // No companies at all — let the request through; controllers that need one will guard.
            return $next($request);
        }

        // Auto-heal stale user.default_company_id when we picked a different working one.
        if ((int) $user->default_company_id !== (int) $resolved) {
            $user->forceFill(['default_company_id' => $resolved])->save();
        }

        app()->instance('active_company_id', $resolved);
        $request->attributes->set('active_company_id', $resolved);

        return $next($request);
    }

    /** True if this company id is active, non-deleted, and the user has access (or has bypass). */
    private function candidateUsable(int $companyId, $user, bool $hasBypass): bool
    {
        $exists = Company::query()->whereKey($companyId)->where('is_active', true)->exists();
        if (! $exists) return false;
        if ($hasBypass) return true;
        return $user->companies()->where('companies.id', $companyId)->exists();
    }
}
