<?php

namespace Modules\Sales\Events;

use Modules\Sales\Models\InvoicePayment;

class InvoicePaymentReceived
{
    public function __construct(public InvoicePayment $payment) {}
}
