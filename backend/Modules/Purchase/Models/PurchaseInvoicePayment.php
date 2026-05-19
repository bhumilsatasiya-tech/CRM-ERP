<?php

namespace Modules\Purchase\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;

class PurchaseInvoicePayment extends Model
{
    use BelongsToCompany;
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'purchase_invoice_id', 'partner_id',
        'payment_date', 'amount', 'mode', 'reference',
        'currency', 'exchange_rate', 'notes', 'created_by',
    ];

    protected $casts = [
        'payment_date'  => 'date',
        'amount'        => 'decimal:2',
        'exchange_rate' => 'decimal:6',
    ];

    public function purchaseInvoice(): BelongsTo { return $this->belongsTo(PurchaseInvoice::class); }
    public function partner(): BelongsTo { return $this->belongsTo(Partner::class); }
}
