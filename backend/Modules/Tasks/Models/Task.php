<?php

namespace Modules\Tasks\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Auth\Models\User;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class Task extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const STATUS_OPEN        = 'open';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_DONE        = 'done';
    public const STATUS_CANCELLED   = 'cancelled';

    protected $fillable = [
        'company_id', 'title', 'description', 'due_date', 'assignee_id',
        'status', 'priority', 'related_type', 'related_id',
        'google_event_id', 'google_synced_at', 'completed_at',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'due_date'         => 'datetime',
        'google_synced_at' => 'datetime',
        'completed_at'     => 'datetime',
    ];

    public function assignee(): BelongsTo { return $this->belongsTo(User::class, 'assignee_id'); }
    public function reminders(): HasMany { return $this->hasMany(Reminder::class); }
    public function related(): MorphTo { return $this->morphTo(); }
}
