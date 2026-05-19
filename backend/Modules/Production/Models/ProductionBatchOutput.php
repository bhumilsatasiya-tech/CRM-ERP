<?php

namespace Modules\Production\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Inventory\Models\StockLedger;
use Modules\Products\Models\Product;

class ProductionBatchOutput extends Model
{
    public const TYPE_FINISHED   = 'finished';
    public const TYPE_BY_PRODUCT = 'by_product';
    public const TYPE_SCRAP      = 'scrap';

    protected $table = 'production_batch_outputs';

    protected $fillable = [
        'batch_id', 'product_id', 'output_type',
        'qty_planned', 'qty_produced',
        'rate', 'line_value',
        'output_batch_no', 'expiry_date', 'ledger_id',
        'notes',
    ];

    protected $casts = [
        'qty_planned'  => 'decimal:4',
        'qty_produced' => 'decimal:4',
        'rate'         => 'decimal:4',
        'line_value'   => 'decimal:2',
        'expiry_date'  => 'date',
    ];

    public function batch(): BelongsTo { return $this->belongsTo(ProductionBatch::class, 'batch_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function ledger(): BelongsTo { return $this->belongsTo(StockLedger::class, 'ledger_id'); }
}
