<?php

namespace Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Inventory\Http\Requests\StoreStockTransferRequest;
use Modules\Inventory\Http\Requests\UpdateStockTransferRequest;
use Modules\Inventory\Http\Resources\StockTransferResource;
use Modules\Inventory\Models\StockTransfer;
use Modules\Inventory\Services\StockTransferService;

class StockTransferController extends Controller
{
    public function __construct(private StockTransferService $service)
    {
        $this->authorizeResource(StockTransfer::class, 'transfer');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $page = $this->service->paginate($request->only(['search', 'status', 'from', 'to', 'per_page']));
        return StockTransferResource::collection($page);
    }

    public function store(StoreStockTransferRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $tr = $this->service->create($companyId, [
            'code'                  => $data['code'] ?? null,
            'from_warehouse_id'     => $data['from_warehouse_id'],
            'to_warehouse_id'       => $data['to_warehouse_id'],
            'transfer_date'         => $data['transfer_date'] ?? null,
            'expected_arrival_date' => $data['expected_arrival_date'] ?? null,
            'notes'                 => $data['notes'] ?? null,
            'meta'                  => $data['meta'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new StockTransferResource($tr->load(['fromWarehouse', 'toWarehouse', 'lines.product'])))->response()->setStatusCode(201);
    }

    public function show(StockTransfer $transfer): StockTransferResource
    {
        $transfer->load(['fromWarehouse', 'toWarehouse', 'lines.product']);
        return new StockTransferResource($transfer);
    }

    public function update(UpdateStockTransferRequest $request, StockTransfer $transfer): StockTransferResource
    {
        $data = $request->validated();
        $updated = $this->service->update($transfer, $data, $data['lines'] ?? null, $request->user()?->id);
        return new StockTransferResource($updated->load(['fromWarehouse', 'toWarehouse', 'lines.product']));
    }

    public function destroy(StockTransfer $transfer): JsonResponse
    {
        $this->service->delete($transfer);
        return response()->json(['data' => ['message' => 'Transfer deleted.']]);
    }

    public function send(Request $request, StockTransfer $transfer): StockTransferResource
    {
        $this->authorize('send', $transfer);
        $updated = $this->service->send($transfer, $request->user()?->id);
        return new StockTransferResource($updated->load(['fromWarehouse', 'toWarehouse', 'lines.product']));
    }

    public function receive(Request $request, StockTransfer $transfer): StockTransferResource
    {
        $this->authorize('receive', $transfer);
        $updated = $this->service->receive($transfer, $request->user()?->id);
        return new StockTransferResource($updated->load(['fromWarehouse', 'toWarehouse', 'lines.product']));
    }

    public function cancel(Request $request, StockTransfer $transfer): StockTransferResource
    {
        $this->authorize('cancel', $transfer);
        $updated = $this->service->cancel($transfer, $request->input('reason'), $request->user()?->id);
        return new StockTransferResource($updated->load(['fromWarehouse', 'toWarehouse', 'lines.product']));
    }
}
