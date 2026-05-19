<?php

namespace Modules\Export\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TaxInvoice extends Model
{
    use BelongsToCompany, LogsActivity, SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_POSTED    = 'posted';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'code', 'export_invoice_id', 'partner_id',
        'invoice_date', 'date_of_supply', 'reference',
        'currency', 'exchange_rate',
        'transport_mode', 'incoterm',
        'lut_no', 'lut_date', 'tax_details',
        'customs_notification_no', 'customs_notification_date',
        'gstin_supplier', 'gstin_recipient', 'place_of_supply',
        'consignee_partner_id', 'consignee_name', 'consignee_address', 'consignee_country',
        'consignee_contact_person', 'consignee_phone', 'consignee_email', 'consignee_registration_no',
        'notify_party_name', 'notify_party_address',
        'port_of_loading', 'port_of_discharge', 'loading_destination', 'final_destination',
        'payment_terms',
        'subtotal', 'tax_amount', 'tax_type', 'discount', 'shipping', 'total',
        'freight_charge', 'packaging_charge', 'development_charge',
        'subtotal_inr', 'total_inr',
        'status', 'posted_at', 'posted_by',
        'cancelled_at', 'cancelled_by', 'cancellation_reason',
        'terms_and_conditions', 'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'invoice_date'              => 'date',
        'date_of_supply'            => 'date',
        'lut_date'                  => 'date',
        'customs_notification_date' => 'date',
        'exchange_rate' => 'decimal:6',
        'subtotal'      => 'decimal:2', 'tax_amount' => 'decimal:2',
        'discount'      => 'decimal:2', 'shipping'   => 'decimal:2', 'total' => 'decimal:2',
        'freight_charge' => 'decimal:2', 'packaging_charge' => 'decimal:2', 'development_charge' => 'decimal:2',
        'subtotal_inr'  => 'decimal:2', 'total_inr'  => 'decimal:2',
        'posted_at'     => 'datetime', 'cancelled_at' => 'datetime',
        'meta'          => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'export_invoice_id', 'invoice_date', 'currency', 'exchange_rate', 'total', 'total_inr', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('tax_invoice');
    }

    public function items(): HasMany { return $this->hasMany(TaxInvoiceItem::class); }
    public function exportInvoice(): BelongsTo { return $this->belongsTo(ExportInvoice::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function consignee(): BelongsTo { return $this->belongsTo(Partner::class, 'consignee_partner_id'); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
