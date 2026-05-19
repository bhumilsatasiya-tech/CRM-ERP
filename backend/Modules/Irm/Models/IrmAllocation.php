<?php

namespace Modules\Irm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Models\ShippingBill;

class IrmAllocation extends Model
{
    protected $table = 'irm_allocations';

    protected $fillable = [
        'irm_id', 'export_invoice_id', 'shipping_bill_id', 'lodgement_id',
        'amount_fcy', 'amount_inr',
        'allocation_date', 'exchange_rate', 'is_full_realization', 'is_third_party_payment',
        'utilization_status', 'utilization_note',
        'notes', 'created_by',
    ];

    protected $casts = [
        'amount_fcy'         => 'decimal:2',
        'amount_inr'         => 'decimal:2',
        'exchange_rate'      => 'decimal:6',
        'allocation_date'    => 'date',
        'is_full_realization'    => 'boolean',
        'is_third_party_payment' => 'boolean',
    ];

    public function irm(): BelongsTo { return $this->belongsTo(Irm::class); }
    public function exportInvoice(): BelongsTo { return $this->belongsTo(ExportInvoice::class); }
    public function shippingBill(): BelongsTo { return $this->belongsTo(ShippingBill::class); }
    public function lodgement(): BelongsTo { return $this->belongsTo(Lodgement::class); }
}
