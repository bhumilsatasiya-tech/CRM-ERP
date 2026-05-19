<?php

namespace Modules\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id', 'sales_order_item_id', 'product_id', 'hsn_code',
        'qty', 'rate', 'discount_pct', 'tax_rate',
        'line_subtotal', 'tax_amount', 'line_total',
        'batch_no', 'expiry_date', 'ledger_id', 'notes',
    ];

    protected $casts = [
        'qty' => 'decimal:4', 'rate' => 'decimal:4',
        'discount_pct' => 'decimal:2', 'tax_rate' => 'decimal:2',
        'line_subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'line_total' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function invoice(): BelongsTo { return $this->belongsTo(Invoice::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}
