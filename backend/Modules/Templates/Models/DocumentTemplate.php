<?php

namespace Modules\Templates\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DocumentTemplate extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    protected $table = 'document_templates';

    protected $fillable = [
        'company_id', 'doc_type', 'name',
        'html', 'css',
        'paper_size', 'orientation',
        'is_default', 'is_active',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_default' => 'bool',
        'is_active'  => 'bool',
        'meta'       => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'doc_type', 'is_default', 'is_active', 'paper_size', 'orientation'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('document_template');
    }
}
