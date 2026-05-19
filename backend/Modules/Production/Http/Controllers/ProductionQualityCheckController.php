<?php

namespace Modules\Production\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Production\Http\Requests\StoreQualityCheckRequest;
use Modules\Production\Http\Resources\ProductionBatchResource;
use Modules\Production\Http\Resources\ProductionQualityCheckResource;
use Modules\Production\Models\ProductionBatch;
use Modules\Production\Models\ProductionQualityCheck;
use Modules\Production\Services\ProductionBatchService;

class ProductionQualityCheckController extends Controller
{
    public function __construct(private ProductionBatchService $service) {}

    public function store(StoreQualityCheckRequest $request, ProductionBatch $batch): JsonResponse
    {
        $this->authorize('recordQuality', $batch);
        $qc = $this->service->recordQualityCheck($batch, $request->validated(), $request->user()?->id);
        $batch->refresh()->load(['inputs.product', 'outputs.product', 'qualityChecks', 'targetProduct', 'rawWarehouse', 'finishedWarehouse']);
        return response()->json([
            'data' => [
                'quality_check' => new ProductionQualityCheckResource($qc),
                'batch'         => new ProductionBatchResource($batch),
            ],
        ], 201);
    }

    public function destroy(Request $request, ProductionBatch $batch, ProductionQualityCheck $qc): JsonResponse
    {
        $this->authorize('recordQuality', $batch);
        if ($qc->batch_id !== $batch->id) abort(404);
        $this->service->deleteQualityCheck($qc);
        $batch->refresh()->load(['inputs.product', 'outputs.product', 'qualityChecks', 'targetProduct', 'rawWarehouse', 'finishedWarehouse']);
        return response()->json(['data' => new ProductionBatchResource($batch)]);
    }
}
