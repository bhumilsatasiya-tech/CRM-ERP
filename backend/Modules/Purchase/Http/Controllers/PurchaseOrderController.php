<?php

namespace Modules\Purchase\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Purchase\Http\Requests\StorePurchaseOrderRequest;
use Modules\Purchase\Http\Resources\PurchaseOrderResource;
use Modules\Purchase\Models\PurchaseOrder;
use Modules\Purchase\Services\PurchaseService;

class PurchaseOrderController extends Controller
{
    public function __construct(private PurchaseService $service)
    {
        $this->authorizeResource(PurchaseOrder::class, 'order');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return PurchaseOrderResource::collection(
            $this->service->paginatePO($request->only(['search', 'status', 'partner_id', 'per_page']))
        );
    }

    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $po = $this->service->createPO($companyId, [
            'code'          => $data['code'] ?? null,
            'partner_id'    => $data['partner_id'],
            'warehouse_id'  => $data['warehouse_id'] ?? null,
            'order_date'    => $data['order_date'] ?? now()->toDateString(),
            'expected_date' => $data['expected_date'] ?? null,
            'reference'     => $data['reference'] ?? null,
            'currency'      => $data['currency'] ?? 'INR',
            'exchange_rate' => $data['exchange_rate'] ?? 1,
            'tax_type'              => $data['tax_type'] ?? 'cgst_sgst',
            'discount'      => $data['discount'] ?? 0,
            'shipping'      => $data['shipping'] ?? 0,
            'notes'         => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new PurchaseOrderResource($po))->response()->setStatusCode(201);
    }

    public function show(PurchaseOrder $order): PurchaseOrderResource
    {
        $order->load(['items.product', 'partner', 'warehouse']);
        return new PurchaseOrderResource($order);
    }

    public function pdf(PurchaseOrder $order, \Modules\Templates\Services\TemplateService $tpl, \Modules\Templates\Services\PdfService $pdf, \Illuminate\Http\Request $request)
    {
        abort_unless($request->user()?->can('document.pdf.download'), 403, 'Forbidden');
        $html = $tpl->renderModel('purchase_order', $order);
        $template = $tpl->resolveTemplate((int) $order->company_id, 'purchase_order');
        return $pdf->download($html, str_replace('/', '-', "po-{$order->code}.pdf"), $template->paper_size, $template->orientation);
    }

    public function update(StorePurchaseOrderRequest $request, PurchaseOrder $order): PurchaseOrderResource
    {
        $data = $request->validated();
        $updated = $this->service->updatePO($order, $data, $data['lines'] ?? null, $request->user()?->id);
        return new PurchaseOrderResource($updated->load(['items.product', 'partner', 'warehouse']));
    }

    public function destroy(PurchaseOrder $order): JsonResponse
    {
        $this->service->deletePO($order);
        return response()->json(['data' => ['message' => 'PO deleted.']]);
    }

    public function approve(Request $request, PurchaseOrder $order): PurchaseOrderResource
    {
        $this->authorize('approve', $order);
        $updated = $this->service->approvePO($order, $request->user()?->id);
        return new PurchaseOrderResource($updated->load(['items.product', 'partner', 'warehouse']));
    }

    public function cancel(Request $request, PurchaseOrder $order): PurchaseOrderResource
    {
        $this->authorize('approve', $order);
        $updated = $this->service->cancelPO($order, $request->input('reason'), $request->user()?->id);
        return new PurchaseOrderResource($updated->load(['items.product', 'partner', 'warehouse']));
    }
}
