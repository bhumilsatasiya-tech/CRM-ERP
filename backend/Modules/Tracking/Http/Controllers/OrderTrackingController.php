<?php

namespace Modules\Tracking\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Sales\Models\SalesOrder;
use Modules\Tracking\Http\Resources\OrderTrackingResource;
use Modules\Tracking\Services\OrderTrackingService;

class OrderTrackingController extends Controller
{
    public function __construct(private OrderTrackingService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('view', SalesOrder::class);
        if (! $request->user()?->can('tracking.view')) abort(403);

        return OrderTrackingResource::collection(
            $this->service->listOpenOrders($request->only(['search', 'status', 'partner_id', 'per_page']))
        );
    }

    public function show(Request $request, SalesOrder $order): JsonResponse
    {
        if (! $request->user()?->can('tracking.view')) abort(403);
        // Re-use SO view permission so users with sales.order.view see the same data
        $this->authorize('view', $order);

        return response()->json(['data' => $this->service->traceSalesOrder($order)]);
    }
}
