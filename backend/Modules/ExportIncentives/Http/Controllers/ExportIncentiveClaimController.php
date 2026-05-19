<?php

namespace Modules\ExportIncentives\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\ExportIncentives\Http\Requests\StoreExportIncentiveClaimRequest;
use Modules\ExportIncentives\Http\Resources\ExportIncentiveClaimResource;
use Modules\ExportIncentives\Models\ExportIncentiveClaim;
use Modules\ExportIncentives\Services\ExportIncentiveService;

class ExportIncentiveClaimController extends Controller
{
    public function __construct(private ExportIncentiveService $service)
    {
        $this->authorizeResource(ExportIncentiveClaim::class, 'claim');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = $this->service->paginate($request->only(['type', 'status', 'shipping_bill_id', 'from', 'to', 'per_page']));
        return ExportIncentiveClaimResource::collection($rows);
    }

    public function store(StoreExportIncentiveClaimRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $c = $this->service->create($companyId, $request->validated(), $request->user()?->id);
        return (new ExportIncentiveClaimResource($c->load(['shippingBill', 'exportInvoice'])))->response()->setStatusCode(201);
    }

    public function show(ExportIncentiveClaim $claim): ExportIncentiveClaimResource
    {
        return new ExportIncentiveClaimResource($claim->load(['shippingBill', 'exportInvoice']));
    }

    public function update(StoreExportIncentiveClaimRequest $request, ExportIncentiveClaim $claim): ExportIncentiveClaimResource
    {
        $updated = $this->service->update($claim, $request->validated(), $request->user()?->id);
        return new ExportIncentiveClaimResource($updated->load(['shippingBill', 'exportInvoice']));
    }

    public function destroy(ExportIncentiveClaim $claim): JsonResponse
    {
        $this->service->delete($claim);
        return response()->json(['data' => ['message' => 'Claim deleted.']]);
    }

    public function transition(Request $request, ExportIncentiveClaim $claim): ExportIncentiveClaimResource
    {
        $this->authorize('update', $claim);
        $to = (string) $request->input('to_status');
        $payload = $request->only(['credited_amount', 'credited_date', 'bank_ref', 'rejection_reason']);
        $updated = $this->service->transition($claim, $to, $payload, $request->user()?->id);
        return new ExportIncentiveClaimResource($updated->load(['shippingBill', 'exportInvoice']));
    }
}
