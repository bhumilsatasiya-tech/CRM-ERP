<?php

namespace Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Products\Services\ProductService;

/**
 * GET /lookup/products?q=&type=&category_id=&limit=
 * Used by every Quotation / SO / PO / Invoice form for typeahead.
 */
class ProductLookupController extends Controller
{
    public function __construct(private ProductService $products) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('product.view'), 403, 'Forbidden');
        $rows = $this->products->lookup($request->only(['q', 'type', 'category_id', 'limit', 'offset']));
        return response()->json(['data' => $rows]);
    }
}
