<?php

namespace Modules\Companies\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Scope;
use Modules\Companies\Models\Company;

/**
 * Apply to every business model that belongs to a company.
 *  - auto-fills company_id from active context on create
 *  - global query scope: filter by active company unless user has all-companies role
 *
 * Use:
 *   class Partner extends Model {
 *       use \Modules\Companies\Models\Concerns\BelongsToCompany;
 *   }
 */
trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::creating(function ($model) {
            if (empty($model->company_id) && app()->bound('active_company_id')) {
                $model->company_id = app('active_company_id');
            }
        });

        static::addGlobalScope(new class implements Scope {
            public function apply(Builder $builder, $model)
            {
                if (! app()->bound('active_company_id')) {
                    return;
                }
                $user = auth()->user();
                if ($user && method_exists($user, 'hasAnyRole')) {
                    $bypassRoles = config('companies.all_companies_roles', ['super-admin']);
                    if ($user->hasAnyRole($bypassRoles)) {
                        return;
                    }
                }
                $builder->where($model->qualifyColumn('company_id'), app('active_company_id'));
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
