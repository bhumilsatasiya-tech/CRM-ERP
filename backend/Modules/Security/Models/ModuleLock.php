<?php

namespace Modules\Security\Models;

use Illuminate\Database\Eloquent\Model;

class ModuleLock extends Model
{
    public const KEYS = ['project_costing', 'production', 'export_bank'];

    protected $fillable = [
        'company_id', 'module_key', 'is_enabled', 'unlock_minutes', 'notes', 'updated_by',
    ];

    protected $casts = [
        'is_enabled'     => 'boolean',
        'unlock_minutes' => 'integer',
    ];
}
