<?php

namespace Modules\Products\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ProductUnit extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'code', 'name', 'formal_name', 'symbol', 'uqc', 'type',
        'base_unit_id', 'conversion_factor', 'is_base',
        'decimals_allowed', 'is_active',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'conversion_factor' => 'decimal:8',
        'is_base'           => 'boolean',
        'is_active'         => 'boolean',
        'decimals_allowed'  => 'integer',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['company_id', 'code', 'name', 'symbol', 'type', 'is_base', 'conversion_factor', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('product_unit');
    }

    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(self::class, 'base_unit_id');
    }

    public function derivedUnits(): HasMany
    {
        return $this->hasMany(self::class, 'base_unit_id');
    }
}
