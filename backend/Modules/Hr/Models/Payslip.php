<?php

namespace Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    protected $fillable = [
        'salary_run_id', 'employee_id', 'breakdown',
        'gross', 'total_deductions', 'net_pay',
        'paid_at', 'payment_ref',
    ];

    protected $casts = [
        'breakdown'        => 'array',
        'gross'            => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_pay'          => 'decimal:2',
        'paid_at'          => 'datetime',
    ];

    public function run(): BelongsTo { return $this->belongsTo(SalaryRun::class, 'salary_run_id'); }
    public function employee(): BelongsTo { return $this->belongsTo(Employee::class); }
}
