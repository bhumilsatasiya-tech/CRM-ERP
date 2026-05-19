<?php

namespace Modules\Hr\Events;

use Modules\Hr\Models\SalaryRun;

class SalaryRunPosted
{
    public function __construct(public SalaryRun $run) {}
}
