<?php

namespace Modules\Export\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Inventory\Models\StockLedger;
use Modules\Products\Models\Product;

class ShippingBillItem extends Model
{
    protected $table = 'shipping_bill_items';

    protected $fillable = [
        'shipping_bill_id', 'export_invoice_item_id', 'product_id', 'hsn_code',
        'qty', 'batch_no', 'expiry_date',
        'ledger_id', 'notes',
    ];

    protected $casts = [
        'qty' => 'decimal:4',
        'expiry_date' => 'date',
    ];

    public function bill(): BelongsTo { return $this->belongsTo(ShippingBill::class, 'shipping_bill_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function exportInvoiceItem(): BelongsTo { return $this->belongsTo(ExportInvoiceItem::class, 'export_invoice_item_id'); }
    public function ledger(): BelongsTo { return $this->belongsTo(StockLedger::class, 'ledger_id'); }
}
