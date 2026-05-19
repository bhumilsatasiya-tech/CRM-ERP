<?php

namespace Modules\Hr\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Hr\Http\Requests\StoreEmployeeRequest;
use Modules\Hr\Http\Requests\StoreSalaryStructureRequest;
use Modules\Hr\Http\Resources\EmployeeResource;
use Modules\Hr\Models\Employee;
use Modules\Hr\Models\EmployeeSalaryStructure;
use Modules\Settings\Services\SequenceService;

class EmployeeController extends Controller
{
    public function __construct(private SequenceService $sequences)
    {
        $this->authorizeResource(Employee::class, 'employee');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));
        $q = Employee::query()
            ->with(['designation:id,name', 'structures' => fn($q) => $q->latest('effective_from')->limit(1)])
            ->when($request->input('search'), fn($qq, $v) => $qq->where(function ($qqq) use ($v) {
                $qqq->where('code', 'like', "%$v%")->orWhere('name', 'like', "%$v%")->orWhere('email', 'like', "%$v%");
            }))
            ->when($request->input('status'), fn($qq, $v) => $qq->where('status', $v))
            ->when($request->input('designation_id'), fn($qq, $v) => $qq->where('designation_id', (int) $v))
            ->orderBy('code')
            ->paginate($perPage);
        return EmployeeResource::collection($q);
    }

    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $code = $request->input('code') ?? $this->sequences->next($companyId, 'employee');
        $emp = Employee::create(array_merge($request->validated(), [
            'company_id' => $companyId,
            'code' => $code,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]));
        return (new EmployeeResource($emp->load(['designation', 'structures'])))->response()->setStatusCode(201);
    }

    public function show(Employee $employee): EmployeeResource
    {
        $employee->load(['designation', 'structures']);
        return new EmployeeResource($employee);
    }

    public function update(StoreEmployeeRequest $request, Employee $employee): EmployeeResource
    {
        $employee->fill($request->validated());
        $employee->updated_by = $request->user()?->id;
        $employee->save();
        return new EmployeeResource($employee->load(['designation', 'structures']));
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $employee->delete();
        return response()->json(['data' => ['message' => 'Employee deleted.']]);
    }

    public function setStructure(StoreSalaryStructureRequest $request, Employee $employee): EmployeeResource
    {
        $this->authorize('manageStructure', $employee);
        EmployeeSalaryStructure::create([
            'employee_id'    => $employee->id,
            'effective_from' => $request->input('effective_from'),
            'basic'          => $request->input('basic'),
            'components'     => $request->input('components', []),
            'notes'          => $request->input('notes'),
            'created_by'     => $request->user()?->id,
        ]);
        return new EmployeeResource($employee->load(['designation', 'structures']));
    }
}
