<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class Account extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const TYPE_ASSET     = 'asset';
    public const TYPE_LIABILITY = 'liability';
    public const TYPE_EQUITY    = 'equity';
    public const TYPE_INCOME    = 'income';
    public const TYPE_EXPENSE   = 'expense';

    protected $fillable = [
        'company_id', 'code', 'name', 'type', 'parent_id', 'is_group', 'is_system',
        'notes', 'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_group'  => 'boolean',
        'is_system' => 'boolean',
        'meta'      => 'array',
    ];

    public function parent(): BelongsTo { return $this->belongsTo(self::class, 'parent_id'); }
    public function children(): HasMany { return $this->hasMany(self::class, 'parent_id'); }

    /**
     * Sign multiplier for "balance" view: assets/expenses = +; liabilities/equity/income = -.
     * Returns +1 if debit-natured, -1 if credit-natured.
     */
    public function naturalSign(): int
    {
        return in_array($this->type, [self::TYPE_ASSET, self::TYPE_EXPENSE], true) ? 1 : -1;
    }
}
