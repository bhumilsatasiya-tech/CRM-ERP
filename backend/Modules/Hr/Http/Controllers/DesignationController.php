<?php

namespace Modules\Hr\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Hr\Models\Designation;

class DesignationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('hr.designation.view')) abort(403);
        $rows = Designation::orderBy('name')->get();
        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()?->can('hr.designation.create')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validate([
            'code'  => ['required', 'string', 'max:32'],
            'name'  => ['required', 'string', 'max:191'],
            'notes' => ['nullable', 'string'],
        ]);
        $d = Designation::create(array_merge($data, ['company_id' => $companyId]));
        return response()->json(['data' => $d], 201);
    }

    public function update(Request $request, Designation $designation): JsonResponse
    {
        if (! $request->user()?->can('hr.designation.update')) abort(403);
        $designation->fill($request->validate([
            'code'  => ['sometimes', 'string', 'max:32'],
            'name'  => ['sometimes', 'string', 'max:191'],
            'notes' => ['nullable', 'string'],
        ]))->save();
        return response()->json(['data' => $designation]);
    }

    public function destroy(Request $request, Designation $designation): JsonResponse
    {
        if (! $request->user()?->can('hr.designation.delete')) abort(403);
        $designation->delete();
        return response()->json(['data' => ['message' => 'Deleted.']]);
    }
}
