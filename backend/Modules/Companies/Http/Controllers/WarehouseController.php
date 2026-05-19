<?php

namespace Modules\Companies\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Companies\Http\Requests\StoreWarehouseRequest;
use Modules\Companies\Http\Requests\UpdateWarehouseRequest;
use Modules\Companies\Http\Resources\WarehouseResource;
use Modules\Companies\Models\Company;
use Modules\Companies\Models\Warehouse;
use Modules\Companies\Services\WarehouseService;

class WarehouseController extends Controller
{
    public function __construct(private WarehouseService $warehouses) {}

    public function index(Request $request, Company $company): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Warehouse::class);
        $page = $this->warehouses->paginate($company, $request->only(['search', 'type', 'is_active', 'per_page']));
        return WarehouseResource::collection($page);
    }

    public function store(StoreWarehouseRequest $request, Company $company): JsonResponse
    {
        $w = $this->warehouses->create($company, $request->validated(), $request->user()?->id);
        return (new WarehouseResource($w->load('branch')))->response()->setStatusCode(201);
    }

    public function show(Warehouse $warehouse): WarehouseResource
    {
        $this->authorize('view', $warehouse);
        return new WarehouseResource($warehouse->load('branch'));
    }

    public function update(UpdateWarehouseRequest $request, Warehouse $warehouse): WarehouseResource
    {
        $updated = $this->warehouses->update($warehouse, $request->validated(), $request->user()?->id);
        return new WarehouseResource($updated);
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        $this->authorize('delete', $warehouse);
        $this->warehouses->delete($warehouse);
        return response()->json(['data' => ['message' => 'Warehouse deleted.']]);
    }
}
