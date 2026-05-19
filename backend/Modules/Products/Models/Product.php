<?php

namespace Modules\Products\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Product extends Model
{
    use BelongsToCompany;
    use HasFactory;
    use LogsActivity;
    use SoftDeletes;

    public const TYPE_RAW        = 'raw';
    public const TYPE_FINISHED   = 'finished';
    public const TYPE_PACKAGING  = 'packaging';
    public const TYPE_CONSUMABLE = 'consumable';
    public const TYPE_SERVICE    = 'service';

    protected $fillable = [
        'company_id', 'code', 'barcode', 'name', 'description',
        'category_id', 'type', 'is_company_made',
        'unit_id',
        'hsn_code', 'tax_rate',
        'standard_cost', 'last_purchase_cost', 'opening_stock_qty', 'opening_stock_value',
        'standard_price', 'mrp', 'currency',
        'reorder_level', 'reorder_qty', 'min_stock', 'max_stock',
        'lead_time_days', 'shelf_life_days',
        'has_batches', 'has_expiry', 'has_serials',
        'default_warehouse_id',
        'is_active', 'is_purchasable', 'is_sellable', 'is_stockable',
        'weight', 'weight_unit_id', 'length', 'width', 'height',
        'image_path', 'meta', 'notes',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_company_made'      => 'boolean',
        'is_active'            => 'boolean',
        'is_purchasable'       => 'boolean',
        'is_sellable'          => 'boolean',
        'is_stockable'         => 'boolean',
        'has_batches'          => 'boolean',
        'has_expiry'           => 'boolean',
        'has_serials'          => 'boolean',
        'tax_rate'             => 'decimal:2',
        'standard_cost'        => 'decimal:4',
        'last_purchase_cost'   => 'decimal:4',
        'opening_stock_qty'    => 'decimal:4',
        'opening_stock_value'  => 'decimal:2',
        'standard_price'       => 'decimal:4',
        'mrp'                  => 'decimal:4',
        'reorder_level'        => 'decimal:4',
        'reorder_qty'          => 'decimal:4',
        'min_stock'            => 'decimal:4',
        'max_stock'            => 'decimal:4',
        'lead_time_days'       => 'integer',
        'shelf_life_days'      => 'integer',
        'weight'               => 'decimal:4',
        'length'               => 'decimal:4',
        'width'                => 'decimal:4',
        'height'               => 'decimal:4',
        'meta'                 => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'company_id', 'code', 'name', 'type', 'category_id', 'unit_id',
                'hsn_code', 'tax_rate', 'standard_cost', 'standard_price',
                'is_active', 'is_purchasable', 'is_sellable', 'is_stockable',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('product');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class, 'unit_id');
    }

    public function weightUnit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class, 'weight_unit_id');
    }

    public function uomConversions(): HasMany
    {
        return $this->hasMany(ProductUomConversion::class);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    public function scopeOfType(Builder $q, string $type): Builder
    {
        return $q->where('type', $type);
    }
}
