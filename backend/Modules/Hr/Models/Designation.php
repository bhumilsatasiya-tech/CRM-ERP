<?php

namespace Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Companies\Models\Concerns\BelongsToCompany;

class Designation extends Model
{
    use BelongsToCompany, SoftDeletes;
    protected $fillable = ['company_id', 'code', 'name', 'notes'];
}
