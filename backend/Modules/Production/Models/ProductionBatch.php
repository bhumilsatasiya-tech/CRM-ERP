<?php

namespace Modules\Production\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Modules\Companies\Models\Warehouse;
use Modules\Products\Models\Product;
use Modules\Sales\Models\SalesOrder;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ProductionBatch extends Model
{
    use BelongsToCompany;
    use LogsActivity;
    use SoftDeletes;

    public const STATUS_DRAFT       = 'draft';
    public const STATUS_SUBMITTED   = 'submitted';
    public const STATUS_APPROVED    = 'approved';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED   = 'completed';
    public const STATUS_CANCELLED   = 'cancelled';

    public const STAGE_TRIAL = 'trial';
    public const STAGE_FINAL = 'final';
    public const STAGE_QC    = 'qc';

    protected $table = 'production_batches';

    protected $fillable = [
        'company_id', 'code',
        'stage', 'parent_batch_id',
        'target_product_id', 'qty_planned', 'qty_produced', 'qty_failed',
        'raw_warehouse_id', 'finished_warehouse_id', 'sales_order_id',
        'planned_start_date', 'planned_end_date',
        'actual_start_date', 'actual_end_date',
        'output_batch_no', 'output_expiry_date',
        'material_cost',
        'status',
        'submitted_at', 'approved_at', 'started_at', 'completed_at',
        'cancelled_at', 'cancelled_by', 'cancellation_reason',
        'notes', 'meta',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'qty_planned'        => 'decimal:4',
        'qty_produced'       => 'decimal:4',
        'qty_failed'         => 'decimal:4',
        'material_cost'      => 'decimal:2',
        'planned_start_date' => 'date',
        'planned_end_date'   => 'date',
        'actual_start_date'  => 'datetime',
        'actual_end_date'    => 'datetime',
        'output_expiry_date' => 'date',
        'submitted_at'       => 'datetime',
        'approved_at'        => 'datetime',
        'started_at'         => 'datetime',
        'completed_at'       => 'datetime',
        'cancelled_at'       => 'datetime',
        'meta'               => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'target_product_id', 'qty_planned', 'qty_produced', 'qty_failed', 'status', 'material_cost'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('production_batch');
    }

    public function inputs(): HasMany { return $this->hasMany(ProductionBatchInput::class, 'batch_id'); }
    public function outputs(): HasMany { return $this->hasMany(ProductionBatchOutput::class, 'batch_id'); }
    public function qualityChecks(): HasMany { return $this->hasMany(ProductionQualityCheck::class, 'batch_id'); }

    public function targetProduct(): BelongsTo { return $this->belongsTo(Product::class, 'target_product_id'); }
    public function rawWarehouse(): BelongsTo { return $this->belongsTo(Warehouse::class, 'raw_warehouse_id'); }
    public function finishedWarehouse(): BelongsTo { return $this->belongsTo(Warehouse::class, 'finished_warehouse_id'); }
    public function salesOrder(): BelongsTo { return $this->belongsTo(SalesOrder::class, 'sales_order_id'); }

    public function parentBatch(): BelongsTo { return $this->belongsTo(self::class, 'parent_batch_id'); }
    public function childBatches(): HasMany { return $this->hasMany(self::class, 'parent_batch_id'); }

    public function isEditable(): bool { return $this->status === self::STATUS_DRAFT; }
    public function isTrial(): bool { return $this->stage === self::STAGE_TRIAL; }
    public function isFinal(): bool { return $this->stage === self::STAGE_FINAL; }
    public function isQc(): bool    { return $this->stage === self::STAGE_QC; }
}
