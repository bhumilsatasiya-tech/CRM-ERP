<?php

namespace Modules\InterCompany\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Company;
use Modules\Companies\Models\Warehouse;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Sales\Models\Invoice;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Inter-Company Invoice (ICI) — does NOT use BelongsToCompany trait because it
 * legitimately spans two companies. Scoping is enforced at controller level via
 * "user has access to from_company_id".
 */
class InterCompanyInvoice extends Model
{
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_POSTED    = 'posted';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'inter_company_invoices';

    protected $fillable = [
        'from_company_id', 'to_company_id', 'code',
        'from_warehouse_id', 'to_warehouse_id',
        'invoice_date', 'due_date',
        'currency', 'exchange_rate',
        'cost_basis', 'profit_pct',
        'subtotal', 'tax_amount', 'tax_type', 'total',
        'status', 'posted_at', 'posted_by',
        'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'linked_sale_invoice_id', 'linked_purchase_invoice_id',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'invoice_date' => 'date', 'due_date' => 'date',
        'cost_basis' => 'decimal:2', 'profit_pct' => 'decimal:2',
        'subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'total' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'posted_at' => 'datetime', 'cancelled_at' => 'datetime',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'from_company_id', 'to_company_id', 'total', 'status', 'profit_pct'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('inter_company_invoice');
    }

    public function items(): HasMany { return $this->hasMany(InterCompanyInvoiceItem::class); }
    public function fromCompany(): BelongsTo { return $this->belongsTo(Company::class, 'from_company_id'); }
    public function toCompany(): BelongsTo { return $this->belongsTo(Company::class, 'to_company_id'); }
    public function fromWarehouse(): BelongsTo { return $this->belongsTo(Warehouse::class, 'from_warehouse_id'); }
    public function toWarehouse(): BelongsTo { return $this->belongsTo(Warehouse::class, 'to_warehouse_id'); }
    public function linkedSaleInvoice(): BelongsTo { return $this->belongsTo(Invoice::class, 'linked_sale_invoice_id'); }
    public function linkedPurchaseInvoice(): BelongsTo { return $this->belongsTo(PurchaseInvoice::class, 'linked_purchase_invoice_id'); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
