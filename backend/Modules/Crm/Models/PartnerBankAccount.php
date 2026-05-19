<?php

namespace Modules\Crm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PartnerBankAccount extends Model
{
    use LogsActivity;
    use SoftDeletes;

    protected $table = 'partner_bank_accounts';

    protected $fillable = [
        'partner_id', 'bank_name', 'branch', 'account_holder', 'account_no',
        'account_type', 'ifsc', 'swift', 'iban',
        'currency', 'bank_country', 'bank_address',
        'is_primary', 'is_active', 'notes',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_active'  => 'boolean',
    ];

    protected $hidden = [
        // Hide full account number from default JSON; expose via masked accessor.
        // Comment out if your team prefers full visibility.
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['partner_id', 'bank_name', 'account_holder', 'currency', 'is_primary', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('partner_bank');
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function getAccountNoMaskedAttribute(): string
    {
        $v = (string) ($this->attributes['account_no'] ?? '');
        if (strlen($v) <= 4) return $v;
        return str_repeat('•', strlen($v) - 4) . substr($v, -4);
    }
}
