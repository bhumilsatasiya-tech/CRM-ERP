<?php

namespace Modules\Export\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Export\Contracts\OcrProvider;
use Modules\Export\Http\Requests\StoreShippingBillRequest;
use Modules\Export\Http\Resources\ShippingBillResource;
use Modules\Export\Models\ShippingBill;
use Modules\Export\Services\ShippingBillService;

class ShippingBillController extends Controller
{
    public function __construct(private ShippingBillService $service)
    {
        $this->authorizeResource(ShippingBill::class, 'bill');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return ShippingBillResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'export_invoice_id', 'per_page']))
        );
    }

    public function store(StoreShippingBillRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $sb = $this->service->create($companyId, [
            'code'              => $data['code'] ?? null,
            'export_invoice_id' => $data['export_invoice_id'],
            'warehouse_id'      => $data['warehouse_id'],
            'bl_no'             => $data['bl_no'] ?? null,
            'bl_date'           => $data['bl_date'] ?? null,
            'vessel_name'       => $data['vessel_name'] ?? null,
            'voyage_no'         => $data['voyage_no'] ?? null,
            'carrier'           => $data['carrier'] ?? null,
            'container_no'      => $data['container_no'] ?? null,
            'port_of_loading'   => $data['port_of_loading'] ?? null,
            'port_of_discharge' => $data['port_of_discharge'] ?? null,
            'etd'               => $data['etd'] ?? null,
            'eta'               => $data['eta'] ?? null,
            'notes'             => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new ShippingBillResource($sb))->response()->setStatusCode(201);
    }

    public function show(ShippingBill $bill): ShippingBillResource
    {
        $bill->load(['items.product', 'exportInvoice', 'warehouse']);
        return new ShippingBillResource($bill);
    }

    public function update(StoreShippingBillRequest $request, ShippingBill $bill): ShippingBillResource
    {
        $data = $request->validated();
        $updated = $this->service->update($bill, $data, $data['lines'] ?? null, $request->user()?->id);
        return new ShippingBillResource($updated->load(['items.product', 'exportInvoice', 'warehouse']));
    }

    public function destroy(ShippingBill $bill): JsonResponse
    {
        $this->service->delete($bill);
        return response()->json(['data' => ['message' => 'Shipping bill deleted.']]);
    }

    public function dispatchBill(Request $request, ShippingBill $bill): ShippingBillResource
    {
        $this->authorize('dispatch', $bill);
        $updated = $this->service->dispatch($bill, $request->user()?->id);
        return new ShippingBillResource($updated->load(['items.product', 'exportInvoice', 'warehouse']));
    }

    public function cancel(Request $request, ShippingBill $bill): ShippingBillResource
    {
        $this->authorize('dispatch', $bill);
        $updated = $this->service->cancel($bill, $request->input('reason'), $request->user()?->id);
        return new ShippingBillResource($updated->load(['items.product', 'exportInvoice', 'warehouse']));
    }

    /**
     * Run OCR on a Shipping Bill PDF (uploaded inline) and return extracted fields.
     * The frontend can use these to prefill the SB form. Provider is pluggable —
     * default = StubOcrProvider which throws "OCR not configured" until a real
     * provider is bound (Tesseract / Google Vision / Textract / Azure FR).
     */
    public function extractFromPdf(Request $request, OcrProvider $ocr): JsonResponse
    {
        abort_unless($request->user()?->can('export.shipping.create'), 403, 'Forbidden');

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $path = $request->file('file')->getRealPath();
        try {
            $extracted = $ocr->extractShippingBill($path);
            return response()->json(['data' => $extracted]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }
    }
}
