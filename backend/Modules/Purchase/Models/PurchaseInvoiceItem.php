<?php

namespace Modules\Purchase\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class PurchaseInvoiceItem extends Model
{
    protected $fillable = [
        'purchase_invoice_id', 'product_id', 'hsn_code',
        'qty', 'rate', 'discount_pct', 'tax_rate',
        'line_subtotal', 'tax_amount', 'line_total',
        'notes',
    ];

    protected $casts = [
        'qty' => 'decimal:4', 'rate' => 'decimal:4',
        'discount_pct' => 'decimal:2', 'tax_rate' => 'decimal:2',
        'line_subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'line_total' => 'decimal:2',
    ];

    public function invoice(): BelongsTo { return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}
