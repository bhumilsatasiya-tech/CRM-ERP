<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountBalance extends Model
{
    protected $table = 'account_balances';

    protected $fillable = [
        'company_id', 'account_id', 'as_of',
        'debit_total', 'credit_total', 'balance',
    ];

    protected $casts = [
        'as_of' => 'date',
        'debit_total'  => 'decimal:2',
        'credit_total' => 'decimal:2',
        'balance'      => 'decimal:2',
    ];

    public function account(): BelongsTo { return $this->belongsTo(Account::class); }
}
