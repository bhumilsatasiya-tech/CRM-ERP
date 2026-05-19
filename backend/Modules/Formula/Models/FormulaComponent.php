<?php

namespace Modules\Formula\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Products\Models\Product;
use Modules\Products\Models\ProductUnit;

class FormulaComponent extends Model
{
    protected $table = 'formula_components';

    protected $fillable = [
        'formula_id', 'product_id', 'uom_id',
        'qty', 'wastage_pct',
        'notes',
    ];

    protected $casts = [
        'qty'         => 'decimal:4',
        'wastage_pct' => 'decimal:2',
    ];

    public function formula(): BelongsTo { return $this->belongsTo(Formula::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function uom(): BelongsTo { return $this->belongsTo(ProductUnit::class, 'uom_id'); }
}
