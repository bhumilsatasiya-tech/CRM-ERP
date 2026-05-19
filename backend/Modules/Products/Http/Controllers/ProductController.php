<?php

namespace Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Products\Http\Requests\StoreProductRequest;
use Modules\Products\Http\Requests\UpdateProductRequest;
use Modules\Products\Http\Resources\ProductResource;
use Modules\Products\Models\Product;
use Modules\Products\Services\ProductService;

class ProductController extends Controller
{
    public function __construct(private ProductService $products)
    {
        $this->authorizeResource(Product::class, 'product');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $page = $this->products->paginate(
            $request->only(['search', 'type', 'category_id', 'is_active', 'sort', 'per_page'])
        );
        return ProductResource::collection($page);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->products->create($request->validated(), $request->user()?->id);
        return (new ProductResource($product->load(['category', 'unit'])))->response()->setStatusCode(201);
    }

    public function show(Product $product): ProductResource
    {
        $product->load(['category', 'unit', 'uomConversions.unit']);
        return new ProductResource($product);
    }

    public function update(UpdateProductRequest $request, Product $product): ProductResource
    {
        $updated = $this->products->update($product, $request->validated(), $request->user()?->id);
        return new ProductResource($updated);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->products->delete($product);
        return response()->json(['data' => ['message' => 'Product deleted.']]);
    }
}
