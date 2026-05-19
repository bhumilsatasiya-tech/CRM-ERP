<?php

namespace Modules\ExportIncentives\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Models\ShippingBill;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ExportIncentiveClaim extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const TYPE_DRAWBACK    = 'drawback';
    public const TYPE_IGST_REFUND = 'igst_refund';
    public const TYPE_RODTEP      = 'rodtep';

    public const STATUS_PENDING  = 'pending';
    public const STATUS_FILED    = 'filed';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_CREDITED = 'credited';
    public const STATUS_REJECTED = 'rejected';

    protected $table = 'export_incentive_claims';

    protected $fillable = [
        'company_id', 'type',
        'shipping_bill_id', 'export_invoice_id',
        'claim_no', 'claim_date', 'claim_amount', 'claim_currency',
        'status', 'credited_amount', 'credited_date', 'bank_ref',
        'rejection_reason', 'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'claim_date'      => 'date',
        'credited_date'   => 'date',
        'claim_amount'    => 'decimal:2',
        'credited_amount' => 'decimal:2',
        'meta'            => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['type', 'status', 'claim_amount', 'credited_amount', 'claim_no', 'bank_ref'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('export_incentive_claim');
    }

    public function shippingBill(): BelongsTo  { return $this->belongsTo(ShippingBill::class); }
    public function exportInvoice(): BelongsTo { return $this->belongsTo(ExportInvoice::class); }
}
