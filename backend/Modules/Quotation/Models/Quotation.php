<?php

namespace Modules\Quotation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Quotation extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_APPROVED  = 'approved';
    public const STATUS_CONVERTED = 'converted';
    public const STATUS_EXPIRED   = 'expired';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'code', 'partner_id', 'quotation_date', 'valid_until', 'reference',
        'currency', 'exchange_rate',
        'subtotal', 'tax_amount', 'tax_type', 'discount', 'shipping', 'total',
        'status',
        'approved_by', 'approved_at', 'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'converted_to_sales_order_id', 'converted_at',
        'terms_and_conditions', 'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'quotation_date' => 'date', 'valid_until' => 'date',
        'subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2', 'shipping' => 'decimal:2', 'total' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'approved_at' => 'datetime', 'cancelled_at' => 'datetime', 'converted_at' => 'datetime',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'partner_id', 'quotation_date', 'total', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('quotation');
    }

    public function items(): HasMany { return $this->hasMany(QuotationItem::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }

    public function isEditable(): bool { return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED], true); }
}
