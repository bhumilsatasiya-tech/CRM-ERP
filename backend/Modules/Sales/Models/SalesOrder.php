<?php

namespace Modules\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Companies\Models\Warehouse;
use Modules\Crm\Models\Partner;
use Modules\Export\Models\ExportInvoice;
use Modules\Production\Models\ProductionBatch;
use Modules\Quotation\Models\Quotation;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SalesOrder extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT         = 'draft';
    public const STATUS_SUBMITTED     = 'submitted';
    public const STATUS_APPROVED      = 'approved';
    public const STATUS_IN_PRODUCTION = 'in_production';
    public const STATUS_PARTIAL       = 'partial';
    public const STATUS_INVOICED      = 'invoiced';
    public const STATUS_CANCELLED     = 'cancelled';
    public const STATUS_CLOSED        = 'closed';

    protected $fillable = [
        'company_id', 'code', 'partner_id', 'warehouse_id', 'quotation_id',
        'order_date', 'expected_delivery_date', 'reference',
        'currency', 'exchange_rate',
        'subtotal', 'tax_amount', 'tax_type', 'discount', 'shipping', 'total', 'invoiced_amount',
        'status',
        'approved_by', 'approved_at', 'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'terms_and_conditions', 'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'order_date' => 'date', 'expected_delivery_date' => 'date',
        'subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2', 'shipping' => 'decimal:2', 'total' => 'decimal:2',
        'invoiced_amount' => 'decimal:2', 'exchange_rate' => 'decimal:6',
        'approved_at' => 'datetime', 'cancelled_at' => 'datetime',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'partner_id', 'warehouse_id', 'order_date', 'total', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('sales_order');
    }

    public function items(): HasMany { return $this->hasMany(SalesOrderItem::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function invoices(): HasMany { return $this->hasMany(Invoice::class); }
    public function productionBatches(): HasMany { return $this->hasMany(ProductionBatch::class, 'sales_order_id'); }
    public function exportInvoices(): HasMany { return $this->hasMany(ExportInvoice::class, 'sales_order_id'); }
    public function quotation(): BelongsTo { return $this->belongsTo(Quotation::class); }

    public function isEditable(): bool { return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED], true); }
}
