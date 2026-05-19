<?php

namespace Modules\Export\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class TaxInvoiceItem extends Model
{
    protected $fillable = [
        'tax_invoice_id', 'export_invoice_item_id', 'product_id',
        'hsn_code', 'qty', 'shipper_qty', 'shipper_unit',
        'rate', 'discount_pct', 'tax_rate',
        'line_subtotal', 'tax_amount', 'line_total',
        'batch_no', 'expiry_date', 'notes',
    ];

    protected $casts = [
        'qty' => 'decimal:4', 'rate' => 'decimal:4', 'shipper_qty' => 'decimal:4',
        'discount_pct' => 'decimal:2', 'tax_rate' => 'decimal:2',
        'line_subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'line_total' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function taxInvoice(): BelongsTo { return $this->belongsTo(TaxInvoice::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function exportInvoiceItem(): BelongsTo { return $this->belongsTo(ExportInvoiceItem::class, 'export_invoice_item_id'); }
}
