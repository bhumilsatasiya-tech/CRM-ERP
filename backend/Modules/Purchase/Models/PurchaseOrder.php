<?php

namespace Modules\Purchase\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Companies\Models\Warehouse;
use Modules\Crm\Models\Partner;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PurchaseOrder extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_APPROVED  = 'approved';
    public const STATUS_PARTIAL   = 'partial';
    public const STATUS_RECEIVED  = 'received';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_CLOSED    = 'closed';

    protected $fillable = [
        'company_id', 'code', 'partner_id', 'warehouse_id',
        'order_date', 'expected_date', 'reference',
        'currency', 'exchange_rate',
        'subtotal', 'tax_amount', 'tax_type', 'discount', 'shipping', 'total', 'received_amount',
        'status',
        'approved_by', 'approved_at', 'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'notes', 'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'order_date'    => 'date',
        'expected_date' => 'date',
        'subtotal'      => 'decimal:2',
        'tax_amount'    => 'decimal:2',
        'discount'      => 'decimal:2',
        'shipping'      => 'decimal:2',
        'total'         => 'decimal:2',
        'received_amount' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'approved_at'   => 'datetime',
        'cancelled_at'  => 'datetime',
        'meta'          => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'partner_id', 'warehouse_id', 'order_date', 'total', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('purchase_order');
    }

    public function items(): HasMany { return $this->hasMany(PurchaseOrderItem::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function grns(): HasMany { return $this->hasMany(Grn::class); }

    public function isEditable(): bool { return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED], true); }
}
