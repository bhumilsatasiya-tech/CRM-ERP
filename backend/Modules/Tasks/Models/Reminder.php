<?php

namespace Modules\Tasks\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class Reminder extends Model
{
    use BelongsToCompany;

    public const STATUS_PENDING = 'pending';
    public const STATUS_SENT    = 'sent';
    public const STATUS_FAILED  = 'failed';

    protected $fillable = [
        'company_id', 'task_id', 'notify_at', 'channel', 'status', 'sent_at', 'error',
    ];

    protected $casts = [
        'notify_at' => 'datetime',
        'sent_at'   => 'datetime',
    ];

    public function task(): BelongsTo { return $this->belongsTo(Task::class); }
}
