<?php

namespace Modules\Companies\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Companies\Http\Requests\StoreBranchRequest;
use Modules\Companies\Http\Requests\UpdateBranchRequest;
use Modules\Companies\Http\Resources\BranchResource;
use Modules\Companies\Models\Branch;
use Modules\Companies\Models\Company;
use Modules\Companies\Services\BranchService;

class BranchController extends Controller
{
    public function __construct(private BranchService $branches) {}

    public function index(Request $request, Company $company): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Branch::class);
        $page = $this->branches->paginate($company, $request->only(['search', 'is_active', 'per_page']));
        return BranchResource::collection($page);
    }

    public function store(StoreBranchRequest $request, Company $company): JsonResponse
    {
        $branch = $this->branches->create($company, $request->validated(), $request->user()?->id);
        return (new BranchResource($branch))->response()->setStatusCode(201);
    }

    public function show(Branch $branch): BranchResource
    {
        $this->authorize('view', $branch);
        $branch->loadCount('warehouses');
        return new BranchResource($branch);
    }

    public function update(UpdateBranchRequest $request, Branch $branch): BranchResource
    {
        $updated = $this->branches->update($branch, $request->validated(), $request->user()?->id);
        return new BranchResource($updated);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $this->authorize('delete', $branch);
        $this->branches->delete($branch);
        return response()->json(['data' => ['message' => 'Branch deleted.']]);
    }
}
