<?php

namespace Modules\Production\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Auth\Models\User;

class ProductionQualityCheck extends Model
{
    public const RESULT_PASS = 'pass';
    public const RESULT_FAIL = 'fail';

    protected $table = 'production_quality_checks';

    protected $fillable = [
        'batch_id', 'checked_by', 'checked_at',
        'result', 'parameter', 'expected', 'observed', 'notes',
    ];

    protected $casts = [
        'checked_at' => 'datetime',
    ];

    public function batch(): BelongsTo { return $this->belongsTo(ProductionBatch::class, 'batch_id'); }
    public function checker(): BelongsTo { return $this->belongsTo(User::class, 'checked_by'); }
}
