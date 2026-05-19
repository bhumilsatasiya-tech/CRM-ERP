<?php

namespace Modules\Irm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;
use Modules\Export\Models\ExportInvoice;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Irm extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_RECEIVED            = 'received';
    public const STATUS_PARTIALLY_ALLOCATED = 'partially_allocated';
    public const STATUS_ALLOCATED           = 'allocated';
    public const STATUS_CLOSED              = 'closed';
    public const STATUS_CANCELLED           = 'cancelled';

    public const PURPOSE_ADVANCE          = 'advance';
    public const PURPOSE_AGAINST_INVOICE  = 'against_invoice';

    protected $table = 'irms';

    protected $fillable = [
        'company_id', 'code', 'export_invoice_id', 'partner_id',
        'purpose', 'purchase_order_ref', 'proforma_invoice_no',
        'bank_name', 'remitter_name', 'bank_ref_no', 'irm_date',
        'irm_amount_fcy', 'outstanding_amount_fcy',
        'irm_currency', 'exchange_rate',
        'irm_amount_inr', 'outstanding_amount_inr',
        'purpose_code',
        'status',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'irm_date' => 'date',
        'irm_amount_fcy'         => 'decimal:2',
        'outstanding_amount_fcy' => 'decimal:2',
        'irm_amount_inr'         => 'decimal:2',
        'outstanding_amount_inr' => 'decimal:2',
        'exchange_rate'          => 'decimal:6',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'partner_id', 'purpose', 'irm_currency', 'irm_amount_fcy', 'outstanding_amount_fcy', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('irm');
    }

    public function exportInvoice(): BelongsTo { return $this->belongsTo(ExportInvoice::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function allocations(): HasMany { return $this->hasMany(IrmAllocation::class); }
    public function realizations(): HasMany { return $this->hasMany(BankRealization::class); }

    public function isOpen(): bool { return !in_array($this->status, [self::STATUS_CLOSED, self::STATUS_CANCELLED], true); }
}
