<?php

namespace Modules\Projects\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Crm\Models\Partner;

class ProjectCostEntry extends Model
{
    use BelongsToCompany;
    use SoftDeletes;

    public const CATEGORIES = [
        'raw_material',
        'conversion',
        'packaging',
        'labour',
        'transport',
        'utilities',
        'overhead',
        'other',
    ];

    protected $fillable = [
        'company_id', 'project_id',
        'category', 'description',
        'qty', 'unit', 'rate', 'amount',
        'partner_id', 'entry_date',
        'is_planned', 'notes',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'qty'        => 'decimal:4',
        'rate'       => 'decimal:4',
        'amount'     => 'decimal:2',
        'entry_date' => 'date',
        'is_planned' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }
}
