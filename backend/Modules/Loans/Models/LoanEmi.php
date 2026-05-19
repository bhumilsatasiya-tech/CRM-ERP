<?php

namespace Modules\Loans\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanEmi extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_PAID    = 'paid';
    public const STATUS_OVERDUE = 'overdue';

    protected $table = 'loan_emi_schedule';

    protected $fillable = [
        'loan_id', 'installment_no', 'due_date',
        'principal_component', 'interest_component', 'emi_amount',
        'paid_amount', 'status',
    ];

    protected $casts = [
        'due_date' => 'date',
        'principal_component' => 'decimal:2',
        'interest_component'  => 'decimal:2',
        'emi_amount'          => 'decimal:2',
        'paid_amount'         => 'decimal:2',
    ];

    public function loan(): BelongsTo { return $this->belongsTo(Loan::class); }
}
