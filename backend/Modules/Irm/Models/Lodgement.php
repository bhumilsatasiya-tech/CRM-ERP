<?php

namespace Modules\Irm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Lodgement extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_ACCEPTED  = 'accepted';
    public const STATUS_REJECTED  = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'lodgements';

    protected $fillable = [
        'company_id', 'code', 'partner_id',
        'lodgement_date', 'bank_receipt_no', 'bank_receipt_date',
        'status', 'rejection_reason',
        'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'lodgement_date'    => 'date',
        'bank_receipt_date' => 'date',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'partner_id', 'lodgement_date', 'bank_receipt_no', 'status'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('lodgement');
    }

    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
    public function allocations(): HasMany { return $this->hasMany(IrmAllocation::class, 'lodgement_id'); }

    public function isEditable(): bool { return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED], true); }
    public function isFinal(): bool    { return in_array($this->status, [self::STATUS_ACCEPTED, self::STATUS_REJECTED, self::STATUS_CANCELLED], true); }
}
