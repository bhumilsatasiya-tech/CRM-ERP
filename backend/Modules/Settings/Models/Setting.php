<?php

namespace Modules\Settings\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'scope', 'scope_id', 'group', 'key', 'value', 'type',
        'label', 'description', 'options',
        'is_public', 'is_system',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'value'     => 'array',
        'options'   => 'array',
        'is_public' => 'boolean',
        'is_system' => 'boolean',
    ];

    public const SCOPE_GLOBAL  = 'global';
    public const SCOPE_COMPANY = 'company';
    public const SCOPE_USER    = 'user';
}
