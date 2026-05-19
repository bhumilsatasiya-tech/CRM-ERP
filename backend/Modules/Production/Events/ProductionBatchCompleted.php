<?php

namespace Modules\Production\Events;

use Modules\Production\Models\ProductionBatch;

class ProductionBatchCompleted
{
    public function __construct(public ProductionBatch $batch) {}
}
