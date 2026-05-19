<?php

namespace Modules\Companies\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Auth\Models\User;
use Modules\Companies\Models\Company;

class CompanyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $actor): bool
    {
        return $actor->can('company.view');
    }

    public function view(User $actor, Company $company): bool
    {
        if ($actor->can('company.view')) {
            $bypass = config('companies.all_companies_roles', ['super-admin']);
            if (method_exists($actor, 'hasAnyRole') && $actor->hasAnyRole($bypass)) {
                return true;
            }
            return $actor->companies()->where('companies.id', $company->id)->exists();
        }
        return false;
    }

    public function create(User $actor): bool
    {
        return $actor->can('company.create');
    }

    public function update(User $actor, Company $company): bool
    {
        return $actor->can('company.update') && $this->view($actor, $company);
    }

    public function delete(User $actor, Company $company): bool
    {
        return $actor->can('company.delete');
    }
}
