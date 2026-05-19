<?php

namespace Modules\Companies\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Branch extends Model
{
    use BelongsToCompany;
    use HasFactory;
    use LogsActivity;
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'code', 'name', 'is_head_office',
        'email', 'phone',
        'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code',
        'gst_no', 'is_active', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_head_office' => 'boolean',
        'is_active'      => 'boolean',
        'meta'           => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['company_id', 'code', 'name', 'is_head_office', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('branch');
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }
}
