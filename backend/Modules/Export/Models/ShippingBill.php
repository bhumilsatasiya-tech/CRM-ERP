<?php

namespace Modules\Export\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Companies\Models\Warehouse;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ShippingBill extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT      = 'draft';
    public const STATUS_DISPATCHED = 'dispatched';
    public const STATUS_CANCELLED  = 'cancelled';

    protected $table = 'shipping_bills';

    protected $fillable = [
        'company_id', 'code', 'export_invoice_id', 'warehouse_id',
        'bl_no', 'bl_date', 'vessel_name', 'voyage_no', 'carrier', 'container_no',
        'port_of_loading', 'port_of_discharge', 'etd', 'eta',
        'status', 'dispatched_at', 'dispatched_by',
        'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'bl_date' => 'date',
        'etd' => 'date', 'eta' => 'date',
        'dispatched_at' => 'datetime', 'cancelled_at' => 'datetime',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'export_invoice_id', 'bl_no', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('shipping_bill');
    }

    public function items(): HasMany { return $this->hasMany(ShippingBillItem::class); }
    public function exportInvoice(): BelongsTo { return $this->belongsTo(ExportInvoice::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
