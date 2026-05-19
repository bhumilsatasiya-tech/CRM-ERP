<?php

namespace Modules\Production\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Inventory\Models\StockLedger;
use Modules\Products\Models\Product;

class ProductionBatchInput extends Model
{
    protected $table = 'production_batch_inputs';

    protected $fillable = [
        'batch_id', 'product_id',
        'qty_planned', 'qty_consumed',
        'rate', 'line_value',
        'source_batch_no', 'ledger_id',
        'notes',
    ];

    protected $casts = [
        'qty_planned'  => 'decimal:4',
        'qty_consumed' => 'decimal:4',
        'rate'         => 'decimal:4',
        'line_value'   => 'decimal:2',
    ];

    public function batch(): BelongsTo { return $this->belongsTo(ProductionBatch::class, 'batch_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function ledger(): BelongsTo { return $this->belongsTo(StockLedger::class, 'ledger_id'); }
}
