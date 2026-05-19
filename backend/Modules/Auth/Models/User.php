<?php

namespace Modules\Auth\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasRoles;
    use LogsActivity;
    use Notifiable;
    use SoftDeletes;

    protected $guard_name = 'api';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'avatar_path',
        'locale',
        'timezone',
        'default_company_id',
        'is_active',
        'two_factor_enabled',
        'must_change_password',
        'created_by',
        'updated_by',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected $casts = [
        'email_verified_at'    => 'datetime',
        'last_login_at'        => 'datetime',
        'locked_until'         => 'datetime',
        'password_changed_at'  => 'datetime',
        'is_active'            => 'boolean',
        'two_factor_enabled'   => 'boolean',
        'must_change_password' => 'boolean',
        // Laravel 9 has no 'hashed' cast; password hashing is handled in
        // AuthService / UserService / seeders via Hash::make().
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'name', 'email', 'phone', 'is_active',
                'default_company_id', 'two_factor_enabled', 'must_change_password',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "User {$eventName}")
            ->useLogName('user');
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(config('auth_module.super_admin_role', 'super-admin'));
    }

    /**
     * Companies this user has been assigned to (Module 1.2).
     * Defined here to avoid circular module dependency at the relation level.
     */
    public function companies(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(\Modules\Companies\Models\Company::class, 'user_companies')
            ->withPivot(['is_default', 'position'])
            ->withTimestamps();
    }
}
