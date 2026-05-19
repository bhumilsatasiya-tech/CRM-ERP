<?php

namespace Modules\Hr\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Hr\Models\SalaryComponent;

class SalaryComponentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('hr.salary.structure.view')) abort(403);
        return response()->json(['data' => SalaryComponent::orderBy('type')->orderBy('code')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()?->can('hr.salary.structure.edit')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validate([
            'code'         => ['required', 'string', 'max:32'],
            'name'         => ['required', 'string', 'max:191'],
            'type'         => ['required', 'string', 'in:earning,deduction'],
            'is_taxable'   => ['nullable', 'boolean'],
            'formula_type' => ['required', 'string', 'in:fixed,percent_of_basic'],
            'formula_value'=> ['required', 'numeric', 'min:0'],
            'is_active'    => ['nullable', 'boolean'],
            'notes'        => ['nullable', 'string'],
        ]);
        $c = SalaryComponent::create(array_merge($data, ['company_id' => $companyId]));
        return response()->json(['data' => $c], 201);
    }

    public function update(Request $request, SalaryComponent $component): JsonResponse
    {
        if (! $request->user()?->can('hr.salary.structure.edit')) abort(403);
        $component->fill($request->validate([
            'code'         => ['sometimes', 'string', 'max:32'],
            'name'         => ['sometimes', 'string', 'max:191'],
            'type'         => ['sometimes', 'string', 'in:earning,deduction'],
            'is_taxable'   => ['nullable', 'boolean'],
            'formula_type' => ['sometimes', 'string', 'in:fixed,percent_of_basic'],
            'formula_value'=> ['sometimes', 'numeric', 'min:0'],
            'is_active'    => ['nullable', 'boolean'],
            'notes'        => ['nullable', 'string'],
        ]))->save();
        return response()->json(['data' => $component]);
    }

    public function destroy(Request $request, SalaryComponent $component): JsonResponse
    {
        if (! $request->user()?->can('hr.salary.structure.edit')) abort(403);
        $component->delete();
        return response()->json(['data' => ['message' => 'Deleted.']]);
    }
}
