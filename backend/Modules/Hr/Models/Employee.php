<?php

namespace Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Auth\Models\User;
use Modules\Companies\Models\Concerns\BelongsToCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Employee extends Model
{
    use BelongsToCompany, LogsActivity, SoftDeletes;

    public const STATUS_ACTIVE     = 'active';
    public const STATUS_INACTIVE   = 'inactive';
    public const STATUS_RESIGNED   = 'resigned';
    public const STATUS_TERMINATED = 'terminated';

    protected $fillable = [
        'company_id', 'code', 'user_id', 'designation_id',
        'name', 'email', 'phone', 'joining_date', 'date_of_birth', 'gender', 'status',
        'pan', 'aadhar', 'bank_name', 'bank_account_no', 'bank_ifsc',
        'notes', 'meta', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'joining_date'  => 'date',
        'date_of_birth' => 'date',
        'meta'          => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'name', 'designation_id', 'status', 'joining_date'])
            ->logOnlyDirty()->dontSubmitEmptyLogs()->useLogName('employee');
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function designation(): BelongsTo { return $this->belongsTo(Designation::class); }
    public function structures(): HasMany { return $this->hasMany(EmployeeSalaryStructure::class)->orderByDesc('effective_from'); }
    public function payslips(): HasMany { return $this->hasMany(Payslip::class); }

    public function latestStructure(): ?EmployeeSalaryStructure
    {
        return $this->structures()->first();
    }
}
