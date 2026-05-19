<?php

namespace Modules\Irm\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Irm\Http\Requests\StoreLodgementRequest;
use Modules\Irm\Http\Requests\UpdateLodgementRequest;
use Modules\Irm\Http\Resources\LodgementResource;
use Modules\Irm\Models\IrmAllocation;
use Modules\Irm\Models\Lodgement;
use Modules\Irm\Services\LodgementService;

class LodgementController extends Controller
{
    public function __construct(private LodgementService $service)
    {
        $this->authorizeResource(Lodgement::class, 'lodgement');
    }

    private const LOAD = ['partner', 'allocations.exportInvoice', 'allocations.irm.partner'];

    public function index(Request $request): AnonymousResourceCollection
    {
        return LodgementResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'partner_id', 'per_page']))
        );
    }

    public function store(StoreLodgementRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $rows = $data['rows'] ?? [];
        unset($data['rows']);
        $lodge = $this->service->create($companyId, $data, $rows, $request->user()?->id);
        return (new LodgementResource($lodge->load(self::LOAD)))->response()->setStatusCode(201);
    }

    public function show(Lodgement $lodgement): LodgementResource
    {
        $lodgement->load(self::LOAD);
        return new LodgementResource($lodgement);
    }

    public function update(UpdateLodgementRequest $request, Lodgement $lodgement): LodgementResource
    {
        $updated = $this->service->update($lodgement, $request->validated(), $request->user()?->id);
        return new LodgementResource($updated->load(self::LOAD));
    }

    public function destroy(Lodgement $lodgement): JsonResponse
    {
        $this->service->delete($lodgement);
        return response()->json(['data' => ['message' => 'Lodgement deleted.']]);
    }

    public function addRow(Request $request, Lodgement $lodgement): LodgementResource
    {
        $this->authorize('update', $lodgement);
        $row = $request->validate([
            'irm_id'                 => ['required', 'integer', 'exists:irms,id'],
            'export_invoice_id'      => ['required', 'integer', 'exists:export_invoices,id'],
            'amount_fcy'             => ['required', 'numeric', 'gt:0'],
            'exchange_rate'          => ['nullable', 'numeric', 'gt:0'],
            'is_full_realization'    => ['nullable', 'boolean'],
            'is_third_party_payment' => ['nullable', 'boolean'],
            'notes'                  => ['nullable', 'string', 'max:255'],
        ]);
        $updated = $this->service->addRow($lodgement, $row, $request->user()?->id);
        return new LodgementResource($updated->load(self::LOAD));
    }

    public function removeRow(Request $request, Lodgement $lodgement, IrmAllocation $allocation): LodgementResource
    {
        $this->authorize('update', $lodgement);
        if ((int) $allocation->lodgement_id !== (int) $lodgement->id) abort(404);
        $this->service->removeRow($allocation, $request->user()?->id);
        return new LodgementResource($lodgement->fresh(self::LOAD));
    }

    public function markRow(Request $request, Lodgement $lodgement, IrmAllocation $allocation): LodgementResource
    {
        $this->authorize('update', $lodgement);
        if ((int) $allocation->lodgement_id !== (int) $lodgement->id) abort(404);
        $data = $request->validate([
            'utilization_status' => ['required', 'string', 'in:pending,utilised,unutilised,rejected'],
            'utilization_note'   => ['nullable', 'string', 'max:255'],
        ]);
        $this->service->markRow($allocation, $data['utilization_status'], $data['utilization_note'] ?? null, $request->user()?->id);
        return new LodgementResource($lodgement->fresh(self::LOAD));
    }

    public function submit(Request $request, Lodgement $lodgement): LodgementResource
    {
        $this->authorize('submit', $lodgement);
        $updated = $this->service->submit($lodgement, $request->user()?->id);
        return new LodgementResource($updated->load(self::LOAD));
    }

    public function accept(Request $request, Lodgement $lodgement): LodgementResource
    {
        $this->authorize('submit', $lodgement);
        $data = $request->validate([
            'bank_receipt_no'   => ['nullable', 'string', 'max:64'],
            'bank_receipt_date' => ['nullable', 'date'],
            'notes'             => ['nullable', 'string'],
        ]);
        $updated = $this->service->accept($lodgement, $data, $request->user()?->id);
        return new LodgementResource($updated->load(self::LOAD));
    }

    public function reject(Request $request, Lodgement $lodgement): LodgementResource
    {
        $this->authorize('submit', $lodgement);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        $updated = $this->service->reject($lodgement, $data['reason'] ?? null, $request->user()?->id);
        return new LodgementResource($updated->load(self::LOAD));
    }

    public function cancel(Request $request, Lodgement $lodgement): LodgementResource
    {
        $this->authorize('submit', $lodgement);
        $updated = $this->service->cancel($lodgement, $request->user()?->id);
        return new LodgementResource($updated->load(self::LOAD));
    }
}
