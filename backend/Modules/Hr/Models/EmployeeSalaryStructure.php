<?php

namespace Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeSalaryStructure extends Model
{
    protected $fillable = [
        'employee_id', 'effective_from', 'basic', 'components', 'notes', 'created_by',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'basic'          => 'decimal:2',
        'components'     => 'array',
    ];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class); }
}
