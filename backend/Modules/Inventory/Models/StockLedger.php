<?php

namespace Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Companies\Models\Warehouse;
use Modules\Products\Models\Product;

class StockLedger extends Model
{
    use BelongsToCompany;

    protected $table = 'stock_ledger';

    public const OPENING      = 'opening';
    public const IN           = 'in';
    public const OUT          = 'out';
    public const TRANSFER_IN  = 'transfer_in';
    public const TRANSFER_OUT = 'transfer_out';
    public const ADJUSTMENT   = 'adjustment';

    protected $fillable = [
        'company_id', 'warehouse_id', 'product_id',
        'movement_type',
        'reference_type', 'reference_id', 'reference_no',
        'batch_no', 'expiry_date', 'serial_no',
        'qty', 'balance_qty', 'rate', 'value',
        'posted_at',
        'is_reversal', 'reverses_ledger_id',
        'is_reversed', 'reversed_by_ledger_id',
        'notes', 'meta',
        'created_by',
    ];

    protected $casts = [
        'qty'         => 'decimal:4',
        'balance_qty' => 'decimal:4',
        'rate'        => 'decimal:4',
        'value'       => 'decimal:2',
        'posted_at'   => 'datetime',
        'expiry_date' => 'date',
        'is_reversal' => 'boolean',
        'is_reversed' => 'boolean',
        'meta'        => 'array',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function reverses(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reverses_ledger_id');
    }
}
