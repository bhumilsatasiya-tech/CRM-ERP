<?php

namespace Modules\Export\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class PackingListItem extends Model
{
    protected $fillable = [
        'packing_list_id', 'export_invoice_item_id', 'product_id', 'hsn_code',
        'qty', 'packages', 'shipper_unit', 'marks',
        'gross_weight_kg', 'net_weight_kg', 'dimensions',
        'batch_no', 'notes',
    ];

    protected $casts = [
        'qty'             => 'decimal:4',
        'packages'        => 'integer',
        'gross_weight_kg' => 'decimal:3',
        'net_weight_kg'   => 'decimal:3',
    ];

    public function packingList(): BelongsTo { return $this->belongsTo(PackingList::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function exportInvoiceItem(): BelongsTo { return $this->belongsTo(ExportInvoiceItem::class, 'export_invoice_item_id'); }
}
