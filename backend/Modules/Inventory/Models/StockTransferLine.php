<?php

namespace Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class StockTransferLine extends Model
{
    protected $fillable = [
        'transfer_id', 'product_id',
        'qty', 'rate', 'value',
        'batch_no', 'expiry_date', 'serial_no',
        'out_ledger_id', 'in_ledger_id',
        'notes',
    ];

    protected $casts = [
        'qty'         => 'decimal:4',
        'rate'        => 'decimal:4',
        'value'       => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class, 'transfer_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
