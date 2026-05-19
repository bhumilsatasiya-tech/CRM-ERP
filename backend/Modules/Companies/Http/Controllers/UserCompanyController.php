<?php

namespace Modules\Companies\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Auth\Models\User;
use Modules\Companies\Http\Resources\CompanyResource;
use Modules\Companies\Models\Company;
use Modules\Companies\Services\CompanyService;

class UserCompanyController extends Controller
{
    public function __construct(private CompanyService $companies) {}

    /** GET /me/companies — list current user's companies */
    public function myCompanies(Request $request): JsonResponse
    {
        $user = $request->user();
        $bypass = config('companies.all_companies_roles', ['super-admin']);
        $hasBypass = method_exists($user, 'hasAnyRole') && $user->hasAnyRole($bypass);

        $list = $hasBypass
            ? Company::query()->where('is_active', true)->orderBy('name')->get()
            : $user->companies()->where('is_active', true)->orderBy('name')->get();

        return response()->json([
            'data' => CompanyResource::collection($list),
            'meta' => [
                'default_company_id' => $user->default_company_id,
                'has_all_companies_access' => $hasBypass,
            ],
        ]);
    }

    /** POST /me/active-company — set the active + default company for current user */
    public function setActiveCompany(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => ['required', 'integer', Rule::exists('companies', 'id')->whereNull('deleted_at')],
        ]);
        $user = $request->user();
        $bypass = config('companies.all_companies_roles', ['super-admin']);
        $hasBypass = method_exists($user, 'hasAnyRole') && $user->hasAnyRole($bypass);

        if (! $hasBypass && ! $user->companies()->where('companies.id', $data['company_id'])->exists()) {
            abort(403, 'You do not have access to this company.');
        }

        $user->forceFill(['default_company_id' => $data['company_id']])->save();

        return response()->json([
            'data' => ['message' => 'Active company set.', 'company_id' => $data['company_id']],
        ]);
    }

    /** POST /companies/{company}/users/{user} — assign a user to a company */
    public function attach(Request $request, Company $company, User $user): JsonResponse
    {
        abort_unless($request->user()?->can('user.update'), 403, 'Forbidden');
        $data = $request->validate([
            'is_default' => ['nullable', 'boolean'],
            'position'   => ['nullable', 'string', 'max:64'],
        ]);
        $this->companies->attachUser(
            $company, $user,
            (bool) ($data['is_default'] ?? false),
            $data['position'] ?? null
        );
        return response()->json(['data' => ['message' => 'User attached to company.']]);
    }

    /** DELETE /companies/{company}/users/{user} — remove a user from a company */
    public function detach(Request $request, Company $company, User $user): JsonResponse
    {
        abort_unless($request->user()?->can('user.update'), 403, 'Forbidden');
        $this->companies->detachUser($company, $user);
        return response()->json(['data' => ['message' => 'User removed from company.']]);
    }
}
