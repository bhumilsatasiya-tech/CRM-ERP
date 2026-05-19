<?php

namespace Modules\Purchase\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PurchaseInvoice extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT          = 'draft';
    public const STATUS_POSTED         = 'posted';
    public const STATUS_PARTIALLY_PAID = 'partially_paid';
    public const STATUS_PAID           = 'paid';
    public const STATUS_CANCELLED      = 'cancelled';

    protected $fillable = [
        'company_id', 'code', 'partner_id', 'purchase_order_id', 'grn_id',
        'supplier_invoice_no', 'invoice_date', 'due_date',
        'currency', 'exchange_rate',
        'subtotal', 'tax_amount', 'tax_type', 'discount', 'shipping', 'total', 'paid_amount', 'balance',
        'status', 'posted_at',
        'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'notes', 'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'invoice_date' => 'date', 'due_date' => 'date',
        'subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2', 'shipping' => 'decimal:2',
        'total' => 'decimal:2', 'paid_amount' => 'decimal:2', 'balance' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'posted_at' => 'datetime', 'cancelled_at' => 'datetime',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'partner_id', 'invoice_date', 'total', 'paid_amount', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('purchase_invoice');
    }

    public function items(): HasMany { return $this->hasMany(PurchaseInvoiceItem::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function order(): BelongsTo { return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id'); }
    public function grn(): BelongsTo { return $this->belongsTo(Grn::class); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
