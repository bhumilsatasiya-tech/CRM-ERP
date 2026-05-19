<?php

namespace Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class SalaryComponent extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const TYPE_EARNING   = 'earning';
    public const TYPE_DEDUCTION = 'deduction';

    protected $fillable = [
        'company_id', 'code', 'name', 'type',
        'is_taxable', 'formula_type', 'formula_value', 'is_active', 'notes',
    ];

    protected $casts = [
        'is_taxable'    => 'boolean',
        'is_active'     => 'boolean',
        'formula_value' => 'decimal:4',
    ];
}
