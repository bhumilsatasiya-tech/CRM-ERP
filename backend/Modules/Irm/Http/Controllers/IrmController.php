<?php

namespace Modules\Irm\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Irm\Http\Requests\StoreBankRealizationRequest;
use Modules\Irm\Http\Requests\StoreIrmAllocationRequest;
use Modules\Irm\Http\Requests\StoreIrmRequest;
use Modules\Irm\Http\Requests\UpdateIrmRequest;
use Modules\Irm\Http\Resources\IrmResource;
use Modules\Irm\Models\Irm;
use Modules\Irm\Models\IrmAllocation;
use Modules\Irm\Services\IrmService;

class IrmController extends Controller
{
    public function __construct(private IrmService $service)
    {
        $this->authorizeResource(Irm::class, 'irm');
    }

    private const LOAD = ['partner', 'exportInvoice', 'allocations.exportInvoice', 'realizations'];

    public function index(Request $request): AnonymousResourceCollection
    {
        return IrmResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'purpose', 'partner_id', 'export_invoice_id', 'per_page']))
        );
    }

    public function store(StoreIrmRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $irm = $this->service->create($companyId, $request->validated(), $request->user()?->id);
        return (new IrmResource($irm->load(self::LOAD)))->response()->setStatusCode(201);
    }

    public function show(Irm $irm): IrmResource
    {
        $irm->load(self::LOAD);
        return new IrmResource($irm);
    }

    public function update(UpdateIrmRequest $request, Irm $irm): IrmResource
    {
        $updated = $this->service->update($irm, $request->validated(), $request->user()?->id);
        return new IrmResource($updated->load(self::LOAD));
    }

    public function destroy(Irm $irm): JsonResponse
    {
        $this->service->delete($irm);
        return response()->json(['data' => ['message' => 'IRM deleted.']]);
    }

    public function close(StoreBankRealizationRequest $request, Irm $irm): JsonResponse
    {
        $this->authorize('close', $irm);
        $r = $this->service->closeWithRealization($irm, $request->validated(), $request->user()?->id);
        $irm->refresh()->load(self::LOAD);
        return response()->json([
            'data' => [
                'realization_id' => $r->id,
                'irm'            => new IrmResource($irm),
            ],
        ]);
    }

    public function cancel(Request $request, Irm $irm): IrmResource
    {
        $this->authorize('close', $irm);
        $updated = $this->service->cancel($irm, $request->input('reason'), $request->user()?->id);
        return new IrmResource($updated->load(self::LOAD));
    }

    public function allocate(StoreIrmAllocationRequest $request, Irm $irm): IrmResource
    {
        $this->authorize('update', $irm);
        $this->service->allocate($irm, $request->validated(), $request->user()?->id);
        $irm->refresh()->load(self::LOAD);
        return new IrmResource($irm);
    }

    public function deallocate(Request $request, Irm $irm, IrmAllocation $allocation): IrmResource
    {
        $this->authorize('update', $irm);
        if ((int) $allocation->irm_id !== (int) $irm->id) {
            abort(404);
        }
        $this->service->deallocate($allocation, $request->user()?->id);
        $irm->refresh()->load(self::LOAD);
        return new IrmResource($irm);
    }
}
