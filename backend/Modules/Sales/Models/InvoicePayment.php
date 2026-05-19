<?php

namespace Modules\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;

class InvoicePayment extends Model
{
    use BelongsToCompany;
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'invoice_id', 'partner_id',
        'payment_date', 'amount', 'mode', 'reference',
        'currency', 'exchange_rate', 'notes', 'created_by',
    ];

    protected $casts = [
        'payment_date'  => 'date',
        'amount'        => 'decimal:2',
        'exchange_rate' => 'decimal:6',
    ];

    public function invoice(): BelongsTo { return $this->belongsTo(Invoice::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
}
