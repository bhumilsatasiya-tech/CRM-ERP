<?php

namespace Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Products\Http\Requests\StoreProductUomConversionRequest;
use Modules\Products\Http\Resources\ProductUomConversionResource;
use Modules\Products\Models\Product;
use Modules\Products\Models\ProductUomConversion;

class ProductUomConversionController extends Controller
{
    public function index(Product $product): AnonymousResourceCollection
    {
        $this->authorize('view', $product);
        return ProductUomConversionResource::collection(
            $product->uomConversions()->with('unit:id,code,symbol')->orderBy('id')->get()
        );
    }

    public function store(StoreProductUomConversionRequest $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        $conv = $product->uomConversions()->create(array_merge($request->validated(), [
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
            'is_active'  => $request->validated()['is_active'] ?? true,
        ]));
        return (new ProductUomConversionResource($conv->load('unit')))->response()->setStatusCode(201);
    }

    public function update(StoreProductUomConversionRequest $request, ProductUomConversion $conv): ProductUomConversionResource
    {
        $this->authorize('update', $conv->product);
        $conv->fill($request->validated());
        $conv->updated_by = $request->user()?->id;
        $conv->save();
        return new ProductUomConversionResource($conv->load('unit'));
    }

    public function destroy(ProductUomConversion $conv): JsonResponse
    {
        $this->authorize('update', $conv->product);
        $conv->delete();
        return response()->json(['data' => ['message' => 'Conversion deleted.']]);
    }
}
