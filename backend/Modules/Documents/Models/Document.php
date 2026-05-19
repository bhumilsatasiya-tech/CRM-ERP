<?php

namespace Modules\Documents\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class Document extends Model
{
    use BelongsToCompany;
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'attachable_type', 'attachable_id', 'category',
        'original_filename', 'disk', 'path', 'mime_type', 'size_bytes',
        'notes', 'uploaded_by', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function attachable(): MorphTo { return $this->morphTo(); }
}
