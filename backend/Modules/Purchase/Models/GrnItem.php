<?php

namespace Modules\Purchase\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class GrnItem extends Model
{
    protected $fillable = [
        'grn_id', 'purchase_order_item_id', 'product_id', 'hsn_code',
        'qty', 'rate', 'line_total',
        'batch_no', 'expiry_date', 'manufacturing_date', 'serial_no',
        'ledger_id', 'notes',
    ];

    protected $casts = [
        'qty' => 'decimal:4', 'rate' => 'decimal:4', 'line_total' => 'decimal:2',
        'expiry_date' => 'date', 'manufacturing_date' => 'date',
    ];

    public function grn(): BelongsTo { return $this->belongsTo(Grn::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function poItem(): BelongsTo { return $this->belongsTo(PurchaseOrderItem::class, 'purchase_order_item_id'); }
}
