<?php

namespace Modules\Production\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Production\Http\Requests\CompleteProductionBatchRequest;
use Modules\Production\Http\Requests\StoreProductionBatchRequest;
use Modules\Production\Http\Requests\UpdateProductionBatchRequest;
use Modules\Production\Http\Resources\ProductionBatchResource;
use Modules\Production\Models\ProductionBatch;
use Modules\Production\Services\ProductionBatchService;

class ProductionBatchController extends Controller
{
    public function __construct(private ProductionBatchService $service)
    {
        $this->authorizeResource(ProductionBatch::class, 'batch');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductionBatchResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'target_product_id', 'sales_order_id', 'per_page']))
        );
    }

    public function store(StoreProductionBatchRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $batch = $this->service->create($companyId, [
            'code'                  => $data['code'] ?? null,
            'stage'                 => $data['stage'] ?? 'final',
            'parent_batch_id'       => $data['parent_batch_id'] ?? null,
            'target_product_id'     => $data['target_product_id'],
            'qty_planned'           => $data['qty_planned'],
            'raw_warehouse_id'      => $data['raw_warehouse_id'],
            'finished_warehouse_id' => $data['finished_warehouse_id'],
            'sales_order_id'        => $data['sales_order_id'] ?? null,
            'planned_start_date'    => $data['planned_start_date'],
            'planned_end_date'      => $data['planned_end_date'] ?? null,
            'output_batch_no'       => $data['output_batch_no'] ?? null,
            'output_expiry_date'    => $data['output_expiry_date'] ?? null,
            'notes'                 => $data['notes'] ?? null,
        ], $data['inputs'], $data['outputs'], $request->user()?->id);

        return (new ProductionBatchResource($batch))->response()->setStatusCode(201);
    }

    public function show(ProductionBatch $batch): ProductionBatchResource
    {
        $batch->load([
            'inputs.product', 'outputs.product', 'qualityChecks',
            'targetProduct', 'rawWarehouse', 'finishedWarehouse', 'salesOrder',
        ]);
        return new ProductionBatchResource($batch);
    }

    public function update(UpdateProductionBatchRequest $request, ProductionBatch $batch): ProductionBatchResource
    {
        $data    = $request->validated();
        $inputs  = $data['inputs']  ?? null;
        $outputs = $data['outputs'] ?? null;
        unset($data['inputs'], $data['outputs']);
        $updated = $this->service->update($batch, $data, $inputs, $outputs, $request->user()?->id);
        return new ProductionBatchResource($updated);
    }

    public function destroy(ProductionBatch $batch): JsonResponse
    {
        $this->service->delete($batch);
        return response()->json(['data' => ['message' => 'Production batch deleted.']]);
    }

    public function submit(Request $request, ProductionBatch $batch): ProductionBatchResource
    {
        $this->authorize('submit', $batch);
        return new ProductionBatchResource($this->service->submit($batch, $request->user()?->id));
    }

    public function approve(Request $request, ProductionBatch $batch): ProductionBatchResource
    {
        $this->authorize('approve', $batch);
        return new ProductionBatchResource($this->service->approve($batch, $request->user()?->id));
    }

    public function start(Request $request, ProductionBatch $batch): ProductionBatchResource
    {
        $this->authorize('start', $batch);
        return new ProductionBatchResource($this->service->start($batch, $request->user()?->id));
    }

    public function complete(CompleteProductionBatchRequest $request, ProductionBatch $batch): ProductionBatchResource
    {
        $this->authorize('complete', $batch);
        $batch->load(['inputs', 'outputs']);
        return new ProductionBatchResource($this->service->complete($batch, $request->validated(), $request->user()?->id));
    }

    public function cancel(Request $request, ProductionBatch $batch): ProductionBatchResource
    {
        $this->authorize('cancel', $batch);
        $batch->load(['inputs', 'outputs']);
        return new ProductionBatchResource($this->service->cancel($batch, $request->input('reason'), $request->user()?->id));
    }
}
