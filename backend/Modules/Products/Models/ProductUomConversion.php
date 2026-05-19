<?php

namespace Modules\Products\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ProductUomConversion extends Model
{
    use LogsActivity;
    use SoftDeletes;

    protected $table = 'product_uom_conversions';

    protected $fillable = [
        'product_id', 'unit_id', 'conversion_factor',
        'is_purchase_default', 'is_sales_default',
        'notes', 'is_active',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'conversion_factor'   => 'decimal:8',
        'is_purchase_default' => 'boolean',
        'is_sales_default'    => 'boolean',
        'is_active'           => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['product_id', 'unit_id', 'conversion_factor', 'is_purchase_default', 'is_sales_default'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('uom_conversion');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class, 'unit_id');
    }
}
