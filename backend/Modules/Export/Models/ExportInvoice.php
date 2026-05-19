<?php

namespace Modules\Export\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;
use Modules\Sales\Models\SalesOrder;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ExportInvoice extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT          = 'draft';
    public const STATUS_POSTED         = 'posted';
    public const STATUS_PARTIALLY_PAID = 'partially_paid';
    public const STATUS_PAID           = 'paid';
    public const STATUS_CANCELLED      = 'cancelled';

    protected $table = 'export_invoices';

    protected $fillable = [
        'company_id', 'code', 'partner_id', 'sales_order_id',
        'invoice_date', 'date_of_supply', 'due_date', 'reference',
        'currency', 'exchange_rate',
        'incoterm', 'transport_mode',
        'lut_no', 'lut_date', 'tax_details',
        'consignee_partner_id', 'consignee_name', 'consignee_address', 'consignee_country',
        'consignee_contact_person', 'consignee_phone', 'consignee_email', 'consignee_registration_no',
        'notify_party_name', 'notify_party_address',
        'port_of_loading', 'port_of_discharge', 'loading_destination', 'final_destination',
        'country_of_destination', 'payment_terms',
        'subtotal', 'tax_amount', 'tax_type', 'discount', 'shipping',
        'freight_charge', 'packaging_charge', 'development_charge',
        'total', 'paid_amount', 'balance',
        'status', 'posted_at',
        'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'terms_and_conditions', 'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'invoice_date' => 'date', 'date_of_supply' => 'date', 'due_date' => 'date', 'lut_date' => 'date',
        'subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2', 'shipping' => 'decimal:2', 'total' => 'decimal:2',
        'freight_charge' => 'decimal:2', 'packaging_charge' => 'decimal:2', 'development_charge' => 'decimal:2',
        'paid_amount' => 'decimal:2', 'balance' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'posted_at' => 'datetime', 'cancelled_at' => 'datetime',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'partner_id', 'invoice_date', 'currency', 'total', 'paid_amount', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('export_invoice');
    }

    public function items(): HasMany { return $this->hasMany(ExportInvoiceItem::class); }
    public function shippingBills(): HasMany { return $this->hasMany(ShippingBill::class); }
    public function packingLists(): HasMany { return $this->hasMany(PackingList::class); }
    public function taxInvoices(): HasMany { return $this->hasMany(TaxInvoice::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function consignee(): BelongsTo { return $this->belongsTo(Partner::class, 'consignee_partner_id'); }
    public function order(): BelongsTo { return $this->belongsTo(SalesOrder::class, 'sales_order_id'); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
