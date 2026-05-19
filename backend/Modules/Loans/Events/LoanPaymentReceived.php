<?php

namespace Modules\Loans\Events;

use Modules\Loans\Models\LoanPayment;

class LoanPaymentReceived
{
    public function __construct(public LoanPayment $payment) {}
}
