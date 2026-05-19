<?php

namespace Modules\Purchase\Events;

use Modules\Purchase\Models\PurchaseInvoice;

class PurchaseInvoicePosted
{
    public function __construct(public PurchaseInvoice $invoice) {}
}
