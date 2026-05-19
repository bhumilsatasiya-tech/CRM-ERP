<?php

namespace Modules\Irm\Events;

use Modules\Irm\Models\Irm;

class IrmReceived
{
    public function __construct(public Irm $irm) {}
}
