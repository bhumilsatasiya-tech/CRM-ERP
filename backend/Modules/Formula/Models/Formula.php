<?php

namespace Modules\Formula\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Products\Models\Product;
use Modules\Products\Models\ProductUnit;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Formula extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT    = 'draft';
    public const STATUS_ACTIVE   = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'company_id', 'code',
        'target_product_id', 'output_qty', 'output_uom_id',
        'version', 'is_active', 'status',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'output_qty' => 'decimal:4',
        'is_active'  => 'boolean',
        'version'    => 'integer',
        'meta'       => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'target_product_id', 'output_qty', 'version', 'status', 'is_active'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('formula');
    }

    public function targetProduct(): BelongsTo { return $this->belongsTo(Product::class, 'target_product_id'); }
    public function outputUom(): BelongsTo { return $this->belongsTo(ProductUnit::class, 'output_uom_id'); }
    public function components(): HasMany { return $this->hasMany(FormulaComponent::class); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
}
