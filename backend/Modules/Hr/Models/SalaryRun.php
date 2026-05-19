<?php

namespace Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SalaryRun extends Model
{
    use BelongsToCompany, LogsActivity, SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_POSTED    = 'posted';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'code', 'period', 'period_start', 'period_end',
        'status', 'posted_at', 'posted_by',
        'cancelled_at', 'cancelled_by', 'cancellation_reason',
        'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'posted_at'    => 'datetime',
        'cancelled_at' => 'datetime',
        'meta'         => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'period', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('salary_run');
    }

    public function payslips(): HasMany { return $this->hasMany(Payslip::class); }
    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
