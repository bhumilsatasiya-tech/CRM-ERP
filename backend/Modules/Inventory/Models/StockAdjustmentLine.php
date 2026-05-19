<?php

namespace Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;

class StockAdjustmentLine extends Model
{
    protected $fillable = [
        'adjustment_id', 'product_id',
        'current_qty', 'counted_qty', 'difference',
        'rate', 'value',
        'batch_no', 'expiry_date', 'serial_no',
        'ledger_id', 'notes',
    ];

    protected $casts = [
        'current_qty' => 'decimal:4',
        'counted_qty' => 'decimal:4',
        'difference'  => 'decimal:4',
        'rate'        => 'decimal:4',
        'value'       => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(StockAdjustment::class, 'adjustment_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(StockLedger::class, 'ledger_id');
    }
}
