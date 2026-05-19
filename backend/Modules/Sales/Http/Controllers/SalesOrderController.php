<?php

namespace Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Sales\Http\Requests\StoreSalesOrderRequest;
use Modules\Sales\Http\Resources\SalesOrderResource;
use Modules\Sales\Models\SalesOrder;
use Modules\Sales\Services\SalesOrderService;

class SalesOrderController extends Controller
{
    public function __construct(private SalesOrderService $service)
    {
        $this->authorizeResource(SalesOrder::class, 'order');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return SalesOrderResource::collection($this->service->paginate($request->only(['search', 'status', 'partner_id', 'per_page'])));
    }

    public function store(StoreSalesOrderRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $so = $this->service->create($companyId, [
            'code'                   => $data['code'] ?? null,
            'partner_id'             => $data['partner_id'],
            'warehouse_id'           => $data['warehouse_id'] ?? null,
            'order_date'             => $data['order_date'] ?? now()->toDateString(),
            'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
            'reference'              => $data['reference'] ?? null,
            'currency'               => $data['currency'] ?? 'INR',
            'exchange_rate'          => $data['exchange_rate'] ?? 1,
            'tax_type'              => $data['tax_type'] ?? 'cgst_sgst',
            'discount'               => $data['discount'] ?? 0,
            'shipping'               => $data['shipping'] ?? 0,
            'terms_and_conditions'   => $data['terms_and_conditions'] ?? null,
            'notes'                  => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new SalesOrderResource($so))->response()->setStatusCode(201);
    }

    public function show(SalesOrder $order): SalesOrderResource
    {
        $order->load(['items.product', 'partner', 'warehouse', 'quotation', 'productionBatches', 'invoices', 'exportInvoices']);
        return new SalesOrderResource($order);
    }

    public function pdf(SalesOrder $order, \Modules\Templates\Services\TemplateService $tpl, \Modules\Templates\Services\PdfService $pdf, \Illuminate\Http\Request $request)
    {
        abort_unless($request->user()?->can('document.pdf.download'), 403, 'Forbidden');
        $html = $tpl->renderModel('sales_order', $order);
        $template = $tpl->resolveTemplate((int) $order->company_id, 'sales_order');
        return $pdf->download($html, str_replace('/', '-', "proforma-{$order->code}.pdf"), $template->paper_size, $template->orientation);
    }

    public function update(StoreSalesOrderRequest $request, SalesOrder $order): SalesOrderResource
    {
        $data = $request->validated();
        $updated = $this->service->update($order, $data, $data['lines'] ?? null, $request->user()?->id);
        return new SalesOrderResource($updated->load(['items.product', 'partner', 'warehouse', 'quotation', 'productionBatches', 'invoices', 'exportInvoices']));
    }

    public function destroy(SalesOrder $order): JsonResponse
    {
        $this->service->delete($order);
        return response()->json(['data' => ['message' => 'SO deleted.']]);
    }

    public function approve(Request $request, SalesOrder $order): SalesOrderResource
    {
        $this->authorize('approve', $order);
        $updated = $this->service->approve($order, $request->user()?->id);
        return new SalesOrderResource($updated->load(['items.product', 'partner', 'warehouse', 'quotation', 'productionBatches', 'invoices', 'exportInvoices']));
    }

    public function cancel(Request $request, SalesOrder $order): SalesOrderResource
    {
        $this->authorize('approve', $order);
        $updated = $this->service->cancel($order, $request->input('reason'), $request->user()?->id);
        return new SalesOrderResource($updated->load(['items.product', 'partner', 'warehouse', 'quotation', 'productionBatches', 'invoices', 'exportInvoices']));
    }
}
