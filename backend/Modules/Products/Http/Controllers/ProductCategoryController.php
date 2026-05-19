<?php

namespace Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Products\Http\Requests\StoreProductCategoryRequest;
use Modules\Products\Http\Requests\UpdateProductCategoryRequest;
use Modules\Products\Http\Resources\ProductCategoryResource;
use Modules\Products\Models\ProductCategory;
use Modules\Products\Services\ProductCategoryService;

class ProductCategoryController extends Controller
{
    public function __construct(private ProductCategoryService $categories)
    {
        $this->authorizeResource(ProductCategory::class, 'category');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = ProductCategory::query()
            ->when($request->filled('search'), fn($q) => $q->where(function ($qq) use ($request) {
                $like = '%'.$request->string('search').'%';
                $qq->where('code', 'like', $like)->orWhere('name', 'like', $like);
            }))
            ->orderBy('path')->orderBy('sort_order')->orderBy('name')
            ->get();
        return ProductCategoryResource::collection($rows);
    }

    public function store(StoreProductCategoryRequest $request): JsonResponse
    {
        $cat = $this->categories->create($request->validated(), $request->user()?->id);
        return (new ProductCategoryResource($cat))->response()->setStatusCode(201);
    }

    public function show(ProductCategory $category): ProductCategoryResource
    {
        return new ProductCategoryResource($category);
    }

    public function update(UpdateProductCategoryRequest $request, ProductCategory $category): ProductCategoryResource
    {
        $updated = $this->categories->update($category, $request->validated(), $request->user()?->id);
        return new ProductCategoryResource($updated);
    }

    public function destroy(ProductCategory $category): JsonResponse
    {
        $this->categories->delete($category);
        return response()->json(['data' => ['message' => 'Category deleted.']]);
    }
}
