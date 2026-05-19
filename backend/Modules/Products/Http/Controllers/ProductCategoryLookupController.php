<?php

namespace Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Products\Services\ProductCategoryService;

/**
 * GET /lookup/product-categories?q=&limit=&offset=
 * Used by SmartDropdown on Product form.
 */
class ProductCategoryLookupController extends Controller
{
    public function __construct(private ProductCategoryService $categories) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('category.view'), 403, 'Forbidden');
        $rows = $this->categories->lookup($request->only(['q', 'limit', 'offset']));
        return response()->json(['data' => $rows]);
    }
}
