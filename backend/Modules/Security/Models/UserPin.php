<?php

namespace Modules\Security\Models;

use Illuminate\Database\Eloquent\Model;

class UserPin extends Model
{
    protected $fillable = [
        'user_id', 'pin_hash', 'failed_attempts', 'locked_until', 'last_unlock_at',
    ];

    protected $casts = [
        'failed_attempts' => 'integer',
        'locked_until'    => 'datetime',
        'last_unlock_at'  => 'datetime',
    ];
}
