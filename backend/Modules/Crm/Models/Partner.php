<?php

namespace Modules\Crm\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Partner extends Model
{
    use BelongsToCompany;
    use HasFactory;
    use LogsActivity;
    use SoftDeletes;

    public const TYPE_CLIENT       = 'client';
    public const TYPE_SUPPLIER     = 'supplier';
    public const TYPE_VENDOR       = 'vendor';
    public const TYPE_MANUFACTURER = 'manufacturer';
    public const TYPE_IMPORTER     = 'importer';
    public const TYPE_EMPLOYEE     = 'employee';
    public const TYPE_LOGISTIC     = 'logistic';
    public const TYPE_OTHER        = 'other';

    protected $fillable = [
        'company_id', 'code', 'name', 'legal_name', 'is_company', 'type',
        'email', 'phone', 'mobile', 'website', 'country',
        'gst_no', 'pan_no', 'vat_no', 'cin_no', 'tax_treatment',
        'industry', 'segment',
        'currency', 'credit_limit', 'credit_days',
        'opening_balance', 'opening_balance_type', 'default_payment_terms_days',
        'default_warehouse_id', 'default_billing_address_id',
        'default_shipping_address_id', 'default_bank_account_id',
        'is_active', 'is_blacklisted', 'blacklist_reason',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_company'                => 'boolean',
        'is_active'                 => 'boolean',
        'is_blacklisted'            => 'boolean',
        'credit_limit'              => 'decimal:2',
        'credit_days'               => 'integer',
        'opening_balance'           => 'decimal:2',
        'default_payment_terms_days'=> 'integer',
        'meta'                      => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'company_id', 'code', 'name', 'type', 'gst_no', 'pan_no',
                'is_active', 'is_blacklisted', 'credit_limit', 'credit_days',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('partner');
    }

    /* ---------- Relations ---------- */

    public function contacts(): HasMany
    {
        return $this->hasMany(PartnerContact::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(PartnerAddress::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(PartnerBankAccount::class);
    }

    /* ---------- Scopes ---------- */

    public function scopeOfType(Builder $q, string $type): Builder
    {
        return $q->where('type', $type);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true)->where('is_blacklisted', false);
    }
}
