<?php

namespace Modules\Companies\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Auth\Models\User;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Company extends Model
{
    use HasFactory;
    use LogsActivity;
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'legal_name', 'type',
        'gst_no', 'pan_no', 'cin_no', 'iec_no', 'tan_no', 'registration_no',
        'email', 'phone', 'website',
        'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code',
        'bill_to_line1', 'bill_to_line2', 'bill_to_city', 'bill_to_state', 'bill_to_country', 'bill_to_postal_code',
        'ship_to_line1', 'ship_to_line2', 'ship_to_city', 'ship_to_state', 'ship_to_country', 'ship_to_postal_code',
        'currency', 'fiscal_year_start',
        'logo_path', 'is_active', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_active'         => 'boolean',
        'fiscal_year_start' => 'date',
        'meta'              => 'array',
    ];

    public const TYPE_EXPORT    = 'export';
    public const TYPE_SUPPLYING = 'supplying';

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'name', 'legal_name', 'type', 'gst_no', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Company {$eventName}")
            ->useLogName('company');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_companies')
            ->withPivot(['is_default', 'position'])
            ->withTimestamps();
    }
}
