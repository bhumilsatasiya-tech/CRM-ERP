<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class JournalEntry extends Model
{
    use BelongsToCompany, LogsActivity, SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_POSTED    = 'posted';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'company_id', 'code', 'entry_date', 'narration',
        'reference_type', 'reference_id', 'reference_no',
        'total_debit', 'total_credit',
        'status', 'posted_at', 'posted_by',
        'cancelled_at', 'cancelled_by', 'cancellation_reason',
        'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'posted_at'  => 'datetime',
        'cancelled_at' => 'datetime',
        'total_debit'  => 'decimal:2',
        'total_credit' => 'decimal:2',
        'meta' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'entry_date', 'status', 'total_debit', 'total_credit'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('journal_entry');
    }

    public function lines(): HasMany { return $this->hasMany(JournalLine::class); }
    public function reference(): MorphTo { return $this->morphTo(); }
    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
