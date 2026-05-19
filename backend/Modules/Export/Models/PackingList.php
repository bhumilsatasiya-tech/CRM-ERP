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

class PackingList extends Model
{
    use BelongsToCompany, LogsActivity, SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_FINALIZED = 'finalized';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'code', 'export_invoice_id', 'partner_id',
        'pl_date', 'invoice_date', 'date_of_supply',
        'transport_mode', 'incoterm', 'lut_no', 'lut_date', 'tax_details', 'place_of_supply',
        'consignee_partner_id', 'consignee_name', 'consignee_address', 'consignee_country',
        'consignee_contact_person', 'consignee_phone', 'consignee_email', 'consignee_registration_no',
        'notify_party_name', 'notify_party_address',
        'port_of_loading', 'port_of_discharge', 'loading_destination', 'final_destination',
        'marks_and_numbers',
        'total_packages', 'total_pallet_qty', 'gross_weight_kg', 'net_weight_kg', 'volume_cbm',
        'status', 'finalized_at', 'finalized_by',
        'cancelled_at', 'cancelled_by', 'cancellation_reason',
        'notes', 'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'pl_date' => 'date', 'invoice_date' => 'date', 'date_of_supply' => 'date', 'lut_date' => 'date',
        'finalized_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'gross_weight_kg' => 'decimal:3',
        'net_weight_kg'   => 'decimal:3',
        'volume_cbm'      => 'decimal:3',
        'total_packages'  => 'integer',
        'total_pallet_qty'=> 'integer',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'export_invoice_id', 'pl_date', 'status', 'total_packages'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('packing_list');
    }

    public function items(): HasMany { return $this->hasMany(PackingListItem::class); }
    public function exportInvoice(): BelongsTo { return $this->belongsTo(ExportInvoice::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function consignee(): BelongsTo { return $this->belongsTo(Partner::class, 'consignee_partner_id'); }
    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
