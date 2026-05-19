<?php

namespace Modules\Tasks\Models;

use Illuminate\Database\Eloquent\Model;

class OauthToken extends Model
{
    protected $fillable = [
        'user_id', 'provider', 'access_token', 'refresh_token', 'expires_at', 'scope', 'meta',
    ];

    protected $casts = [
        'access_token'  => 'encrypted',
        'refresh_token' => 'encrypted',
        'expires_at'    => 'datetime',
        'meta'          => 'array',
    ];
}
