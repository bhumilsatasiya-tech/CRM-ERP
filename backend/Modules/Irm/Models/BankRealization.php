<?php

namespace Modules\Irm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class BankRealization extends Model
{
    use BelongsToCompany;

    protected $table = 'bank_realizations';

    protected $fillable = [
        'company_id', 'irm_id',
        'realization_date', 'bank_ref',
        'commission', 'tds', 'net_inr',
        'notes', 'created_by',
    ];

    protected $casts = [
        'realization_date' => 'date',
        'commission' => 'decimal:2',
        'tds' => 'decimal:2',
        'net_inr' => 'decimal:2',
    ];

    public function irm(): BelongsTo { return $this->belongsTo(Irm::class); }
}
