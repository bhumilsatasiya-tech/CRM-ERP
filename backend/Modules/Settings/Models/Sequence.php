<?php

namespace Modules\Settings\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Sequence extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'doc_type', 'name', 'prefix', 'suffix',
        'current_number', 'padding', 'format', 'reset_period',
        'last_reset_at', 'is_active',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'current_number' => 'integer',
        'padding'        => 'integer',
        'is_active'      => 'boolean',
        'last_reset_at'  => 'date',
    ];

    public const RESET_NEVER   = 'never';
    public const RESET_YEARLY  = 'yearly';
    public const RESET_MONTHLY = 'monthly';

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['company_id', 'doc_type', 'prefix', 'format', 'current_number', 'reset_period', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('sequence');
    }
}
