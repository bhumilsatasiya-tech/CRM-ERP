<?php

namespace Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Companies\Models\Warehouse;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class StockAdjustment extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_APPROVED  = 'approved';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'warehouse_id', 'code', 'adjustment_date',
        'reason', 'status',
        'submitted_by', 'submitted_at',
        'approved_by', 'approved_at',
        'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'adjustment_date' => 'date',
        'submitted_at'    => 'datetime',
        'approved_at'     => 'datetime',
        'cancelled_at'    => 'datetime',
        'meta'            => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'warehouse_id', 'reason', 'status', 'adjustment_date'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('stock_adjustment');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(StockAdjustmentLine::class, 'adjustment_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function isEditable(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }
}
