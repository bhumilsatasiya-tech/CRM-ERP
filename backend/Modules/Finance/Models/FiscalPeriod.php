<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class FiscalPeriod extends Model
{
    use BelongsToCompany;

    public const STATUS_OPEN   = 'open';
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'company_id', 'code', 'start_date', 'end_date', 'status',
        'closed_at', 'closed_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
        'closed_at'  => 'datetime',
    ];
}
