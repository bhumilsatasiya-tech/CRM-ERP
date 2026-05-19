<?php

namespace Modules\Crm\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Crm\Services\PartnerService;

/**
 * GET /lookup/partners?q=acme&type=client&limit=20
 *
 * Used by every Quotation / SO / PO / Invoice form for autosuggest.
 * Permission: any authenticated user with `partner.view` (most app users have this).
 */
class PartnerLookupController extends Controller
{
    public function __construct(private PartnerService $partners) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('partner.view'), 403, 'Forbidden');

        $rows = $this->partners->lookup($request->only(['q', 'type', 'limit', 'offset']));
        return response()->json(['data' => $rows]);
    }
}
