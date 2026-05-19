<?php

namespace Modules\Comms\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class CommMessage extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const STATUS_QUEUED    = 'queued';
    public const STATUS_SENT      = 'sent';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_FAILED    = 'failed';

    protected $fillable = [
        'company_id', 'direction', 'channel', 'to_addr', 'from_addr',
        'subject', 'body', 'status', 'provider_message_id',
        'attempted_at', 'delivered_at', 'error',
        'related_type', 'related_id', 'created_by',
    ];

    protected $casts = [
        'attempted_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function related(): MorphTo { return $this->morphTo(); }
}
