<?php

namespace Modules\Sales\Events;

use Modules\Sales\Models\Invoice;

class InvoicePosted
{
    public function __construct(public Invoice $invoice) {}
}
