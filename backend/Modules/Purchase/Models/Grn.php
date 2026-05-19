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

class Grn extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_RECEIVED  = 'received';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'grns';

    protected $fillable = [
        'company_id', 'code', 'purchase_order_id', 'partner_id', 'warehouse_id',
        'grn_date', 'supplier_invoice_no', 'supplier_invoice_date',
        'vehicle_no', 'lr_no',
        'status',
        'received_by', 'received_at', 'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'notes', 'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'grn_date'              => 'date',
        'supplier_invoice_date' => 'date',
        'received_at'           => 'datetime',
        'cancelled_at'          => 'datetime',
        'meta'                  => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'purchase_order_id', 'partner_id', 'warehouse_id', 'grn_date', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('grn');
    }

    public function items(): HasMany { return $this->hasMany(GrnItem::class); }
    public function order(): BelongsTo { return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id'); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
