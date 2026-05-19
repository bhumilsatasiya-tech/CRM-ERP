<?php

namespace Modules\InterCompany\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Inventory\Models\StockLedger;
use Modules\Products\Models\Product;

class InterCompanyInvoiceItem extends Model
{
    protected $table = 'inter_company_invoice_items';

    protected $fillable = [
        'inter_company_invoice_id', 'product_id', 'hsn_code',
        'qty', 'cost_rate', 'sell_rate', 'tax_rate',
        'line_subtotal', 'tax_amount', 'line_total',
        'batch_no', 'expiry_date',
        'from_ledger_id', 'to_ledger_id',
        'notes',
    ];

    protected $casts = [
        'qty' => 'decimal:4',
        'cost_rate' => 'decimal:4', 'sell_rate' => 'decimal:4',
        'tax_rate' => 'decimal:2',
        'line_subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'line_total' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function ici(): BelongsTo { return $this->belongsTo(InterCompanyInvoice::class, 'inter_company_invoice_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function fromLedger(): BelongsTo { return $this->belongsTo(StockLedger::class, 'from_ledger_id'); }
    public function toLedger(): BelongsTo { return $this->belongsTo(StockLedger::class, 'to_ledger_id'); }
}
