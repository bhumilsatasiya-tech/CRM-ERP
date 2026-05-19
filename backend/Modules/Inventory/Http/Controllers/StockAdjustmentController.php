<?php

namespace Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Inventory\Http\Requests\StoreStockAdjustmentRequest;
use Modules\Inventory\Http\Requests\UpdateStockAdjustmentRequest;
use Modules\Inventory\Http\Resources\StockAdjustmentResource;
use Modules\Inventory\Models\StockAdjustment;
use Modules\Inventory\Services\StockAdjustmentService;

class StockAdjustmentController extends Controller
{
    public function __construct(private StockAdjustmentService $service)
    {
        $this->authorizeResource(StockAdjustment::class, 'adjustment');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $page = $this->service->paginate(
            $request->only(['search', 'status', 'warehouse_id', 'from', 'to', 'per_page'])
        );
        return StockAdjustmentResource::collection($page);
    }

    public function store(StoreStockAdjustmentRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $adj = $this->service->create($companyId, [
            'code'            => $data['code'] ?? null,
            'warehouse_id'    => $data['warehouse_id'],
            'adjustment_date' => $data['adjustment_date'] ?? null,
            'reason'          => $data['reason'] ?? null,
            'notes'           => $data['notes'] ?? null,
            'meta'            => $data['meta'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new StockAdjustmentResource($adj->load(['warehouse', 'lines.product'])))->response()->setStatusCode(201);
    }

    public function show(StockAdjustment $adjustment): StockAdjustmentResource
    {
        $adjustment->load(['warehouse', 'lines.product']);
        return new StockAdjustmentResource($adjustment);
    }

    public function update(UpdateStockAdjustmentRequest $request, StockAdjustment $adjustment): StockAdjustmentResource
    {
        $data = $request->validated();
        $updated = $this->service->update($adjustment, $data, $data['lines'] ?? null, $request->user()?->id);
        return new StockAdjustmentResource($updated->load(['warehouse', 'lines.product']));
    }

    public function destroy(StockAdjustment $adjustment): JsonResponse
    {
        $this->service->delete($adjustment);
        return response()->json(['data' => ['message' => 'Adjustment deleted.']]);
    }

    public function submit(Request $request, StockAdjustment $adjustment): StockAdjustmentResource
    {
        $this->authorize('submit', $adjustment);
        $updated = $this->service->submit($adjustment, $request->user()?->id);
        return new StockAdjustmentResource($updated->load(['warehouse', 'lines.product']));
    }

    public function approve(Request $request, StockAdjustment $adjustment): StockAdjustmentResource
    {
        $this->authorize('approve', $adjustment);
        $updated = $this->service->approve($adjustment, $request->user()?->id);
        return new StockAdjustmentResource($updated->load(['warehouse', 'lines.product']));
    }

    public function cancel(Request $request, StockAdjustment $adjustment): StockAdjustmentResource
    {
        $this->authorize('cancel', $adjustment);
        $updated = $this->service->cancel($adjustment, $request->input('reason'), $request->user()?->id);
        return new StockAdjustmentResource($updated->load(['warehouse', 'lines.product']));
    }
}
