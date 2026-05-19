<?php

namespace Modules\Irm\Events;

use Modules\Irm\Models\BankRealization;

class BankRealizationRecorded
{
    public function __construct(public BankRealization $realization) {}
}
