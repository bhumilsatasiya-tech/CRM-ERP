<?php

namespace Modules\Purchase\Events;

use Modules\Purchase\Models\PurchaseInvoicePayment;

class PurchaseInvoicePaymentMade
{
    public function __construct(public PurchaseInvoicePayment $payment) {}
}
