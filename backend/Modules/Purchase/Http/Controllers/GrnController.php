<?php

namespace Modules\Purchase\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Purchase\Http\Requests\StoreGrnRequest;
use Modules\Purchase\Http\Resources\GrnResource;
use Modules\Purchase\Models\Grn;
use Modules\Purchase\Services\PurchaseService;

class GrnController extends Controller
{
    public function __construct(private PurchaseService $service)
    {
        $this->authorizeResource(Grn::class, 'grn');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return GrnResource::collection($this->service->paginateGRN($request->only(['search', 'status', 'per_page'])));
    }

    public function store(StoreGrnRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $grn = $this->service->createGRN($companyId, [
            'code'                 => $data['code'] ?? null,
            'purchase_order_id'    => $data['purchase_order_id'] ?? null,
            'partner_id'           => $data['partner_id'],
            'warehouse_id'         => $data['warehouse_id'],
            'grn_date'             => $data['grn_date'] ?? now()->toDateString(),
            'supplier_invoice_no'  => $data['supplier_invoice_no'] ?? null,
            'supplier_invoice_date'=> $data['supplier_invoice_date'] ?? null,
            'vehicle_no'           => $data['vehicle_no'] ?? null,
            'lr_no'                => $data['lr_no'] ?? null,
            'notes'                => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new GrnResource($grn))->response()->setStatusCode(201);
    }

    public function show(Grn $grn): GrnResource
    {
        $grn->load(['items.product', 'partner', 'warehouse']);
        return new GrnResource($grn);
    }

    public function update(StoreGrnRequest $request, Grn $grn): GrnResource
    {
        $data = $request->validated();
        $updated = $this->service->updateGRN($grn, $data, $data['lines'] ?? null, $request->user()?->id);
        return new GrnResource($updated->load(['items.product', 'partner', 'warehouse']));
    }

    public function destroy(Grn $grn): JsonResponse
    {
        $this->service->deleteGRN($grn);
        return response()->json(['data' => ['message' => 'GRN deleted.']]);
    }

    public function receive(Request $request, Grn $grn): GrnResource
    {
        $this->authorize('receive', $grn);
        $updated = $this->service->receiveGRN($grn, $request->user()?->id);
        return new GrnResource($updated->load(['items.product', 'partner', 'warehouse']));
    }

    public function cancel(Request $request, Grn $grn): GrnResource
    {
        $this->authorize('receive', $grn);
        $updated = $this->service->cancelGRN($grn, $request->input('reason'), $request->user()?->id);
        return new GrnResource($updated->load(['items.product', 'partner', 'warehouse']));
    }
}
