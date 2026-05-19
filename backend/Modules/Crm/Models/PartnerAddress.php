<?php

namespace Modules\Crm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PartnerAddress extends Model
{
    use LogsActivity;
    use SoftDeletes;

    protected $fillable = [
        'partner_id', 'type', 'label',
        'contact_name', 'phone', 'email',
        'line1', 'line2', 'landmark',
        'city', 'state', 'country', 'postal_code', 'gst_no_at_address',
        'is_primary', 'is_active',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_active'  => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['partner_id', 'type', 'city', 'state', 'country', 'postal_code', 'is_primary'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('partner_address');
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }
}
