<?php

namespace Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Products\Services\ProductUnitService;

/**
 * GET /lookup/product-units?q=&type=&limit=&offset=
 * Used by SmartDropdown on Product form.
 */
class ProductUnitLookupController extends Controller
{
    public function __construct(private ProductUnitService $units) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('unit.view'), 403, 'Forbidden');
        $rows = $this->units->lookup($request->only(['q', 'type', 'limit', 'offset']));
        return response()->json(['data' => $rows]);
    }
}
