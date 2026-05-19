<?php

namespace Modules\Loans\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Loan extends Model
{
    use BelongsToCompany, LogsActivity, SoftDeletes;

    public const TYPE_BORROWED  = 'borrowed';
    public const TYPE_GIVEN     = 'given';
    public const STATUS_DRAFT     = 'draft';
    public const STATUS_ACTIVE    = 'active';
    public const STATUS_CLOSED    = 'closed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'code', 'type', 'partner_id',
        'principal', 'interest_rate_pct', 'tenure_months', 'start_date',
        'emi_amount', 'total_payable', 'total_interest', 'outstanding_principal',
        'status', 'notes', 'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'start_date'            => 'date',
        'principal'             => 'decimal:2',
        'interest_rate_pct'     => 'decimal:2',
        'emi_amount'            => 'decimal:2',
        'total_payable'         => 'decimal:2',
        'total_interest'        => 'decimal:2',
        'outstanding_principal' => 'decimal:2',
        'tenure_months'         => 'integer',
        'meta'                  => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'type', 'principal', 'status', 'outstanding_principal'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('loan');
    }

    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function schedule(): HasMany { return $this->hasMany(LoanEmi::class)->orderBy('installment_no'); }
    public function payments(): HasMany { return $this->hasMany(LoanPayment::class)->orderBy('payment_date'); }
}
