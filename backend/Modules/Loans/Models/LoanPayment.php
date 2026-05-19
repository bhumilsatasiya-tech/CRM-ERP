<?php

namespace Modules\Loans\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanPayment extends Model
{
    protected $fillable = [
        'loan_id', 'emi_id', 'payment_date', 'amount', 'mode', 'bank_ref', 'notes', 'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount'       => 'decimal:2',
    ];

    public function loan(): BelongsTo { return $this->belongsTo(Loan::class); }
    public function emi(): BelongsTo { return $this->belongsTo(LoanEmi::class, 'emi_id'); }
}
