<?php

namespace Modules\Quotation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class QuotationItem extends Model
{
    protected $fillable = [
        'quotation_id', 'product_id', 'hsn_code',
        'qty', 'rate', 'discount_pct', 'tax_rate',
        'line_subtotal', 'tax_amount', 'line_total',
        'notes',
    ];

    protected $casts = [
        'qty' => 'decimal:4', 'rate' => 'decimal:4',
        'discount_pct' => 'decimal:2', 'tax_rate' => 'decimal:2',
        'line_subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'line_total' => 'decimal:2',
    ];

    public function quotation(): BelongsTo { return $this->belongsTo(Quotation::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}
