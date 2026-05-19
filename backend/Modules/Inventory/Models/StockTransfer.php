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

class StockTransfer extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_SENT      = 'sent';
    public const STATUS_RECEIVED  = 'received';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'code',
        'from_warehouse_id', 'to_warehouse_id',
        'transfer_date', 'expected_arrival_date', 'actual_arrival_date',
        'status',
        'sent_by', 'sent_at',
        'received_by', 'received_at',
        'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'transfer_date'         => 'date',
        'expected_arrival_date' => 'date',
        'actual_arrival_date'   => 'date',
        'sent_at'               => 'datetime',
        'received_at'           => 'datetime',
        'cancelled_at'          => 'datetime',
        'meta'                  => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'from_warehouse_id', 'to_warehouse_id', 'status', 'transfer_date'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('stock_transfer');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(StockTransferLine::class, 'transfer_id');
    }

    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'from_warehouse_id');
    }

    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'to_warehouse_id');
    }
}
