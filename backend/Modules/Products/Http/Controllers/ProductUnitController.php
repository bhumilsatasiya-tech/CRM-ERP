<?php

namespace Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Products\Http\Requests\StoreProductUnitRequest;
use Modules\Products\Http\Requests\UpdateProductUnitRequest;
use Modules\Products\Http\Resources\ProductUnitResource;
use Modules\Products\Models\ProductUnit;
use Modules\Products\Services\ProductUnitService;

class ProductUnitController extends Controller
{
    public function __construct(private ProductUnitService $units)
    {
        $this->authorizeResource(ProductUnit::class, 'unit');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductUnitResource::collection(
            $this->units->list($request->only(['search', 'type']))
        );
    }

    public function store(StoreProductUnitRequest $request): JsonResponse
    {
        $unit = $this->units->create($request->validated(), $request->user()?->id);
        return (new ProductUnitResource($unit))->response()->setStatusCode(201);
    }

    public function show(ProductUnit $unit): ProductUnitResource
    {
        return new ProductUnitResource($unit);
    }

    public function update(UpdateProductUnitRequest $request, ProductUnit $unit): ProductUnitResource
    {
        $updated = $this->units->update($unit, $request->validated(), $request->user()?->id);
        return new ProductUnitResource($updated);
    }

    public function destroy(ProductUnit $unit): JsonResponse
    {
        $this->units->delete($unit);
        return response()->json(['data' => ['message' => 'Unit deleted.']]);
    }
}
