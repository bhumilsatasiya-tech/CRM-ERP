<?php

namespace Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Sales\Http\Requests\StoreInvoiceRequest;
use Modules\Sales\Http\Requests\StorePaymentRequest;
use Modules\Sales\Http\Resources\InvoiceResource;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Models\InvoicePayment;
use Modules\Sales\Services\InvoiceService;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceService $service)
    {
        $this->authorizeResource(Invoice::class, 'invoice');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return InvoiceResource::collection($this->service->paginate($request->only(['search', 'status', 'per_page'])));
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $inv = $this->service->create($companyId, [
            'code'                 => $data['code'] ?? null,
            'partner_id'           => $data['partner_id'],
            'sales_order_id'       => $data['sales_order_id'] ?? null,
            'warehouse_id'         => $data['warehouse_id'],
            'invoice_date'         => $data['invoice_date'],
            'due_date'             => $data['due_date'] ?? null,
            'reference'            => $data['reference'] ?? null,
            'currency'             => $data['currency'] ?? 'INR',
            'exchange_rate'        => $data['exchange_rate'] ?? 1,
            'tax_type'              => $data['tax_type'] ?? 'cgst_sgst',
            'discount'             => $data['discount'] ?? 0,
            'shipping'             => $data['shipping'] ?? 0,
            'terms_and_conditions' => $data['terms_and_conditions'] ?? null,
            'notes'                => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new InvoiceResource($inv))->response()->setStatusCode(201);
    }

    public function show(Invoice $invoice): InvoiceResource
    {
        $invoice->load(['items.product', 'partner', 'warehouse', 'payments']);
        return new InvoiceResource($invoice);
    }

    /** Render this invoice as PDF using the active template for doc_type='invoice'. */
    public function pdf(Invoice $invoice, \Modules\Templates\Services\TemplateService $tpl, \Modules\Templates\Services\PdfService $pdf, \Illuminate\Http\Request $request)
    {
        abort_unless($request->user()?->can('document.pdf.download'), 403, 'Forbidden');
        $html = $tpl->renderModel('invoice', $invoice);
        $template = $tpl->resolveTemplate((int) $invoice->company_id, 'invoice');
        return $pdf->download($html, str_replace('/', '-', "invoice-{$invoice->code}.pdf"), $template->paper_size, $template->orientation);
    }

    public function update(StoreInvoiceRequest $request, Invoice $invoice): InvoiceResource
    {
        $data = $request->validated();
        $updated = $this->service->update($invoice, $data, $data['lines'] ?? null, $request->user()?->id);
        return new InvoiceResource($updated->load(['items.product', 'partner', 'warehouse', 'payments']));
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $this->service->delete($invoice);
        return response()->json(['data' => ['message' => 'Invoice deleted.']]);
    }

    public function post(Request $request, Invoice $invoice): InvoiceResource
    {
        $this->authorize('post', $invoice);
        $updated = $this->service->post($invoice, $request->user()?->id);
        return new InvoiceResource($updated->load(['items.product', 'partner', 'warehouse', 'payments']));
    }

    public function cancel(Request $request, Invoice $invoice): InvoiceResource
    {
        $this->authorize('post', $invoice);
        $updated = $this->service->cancel($invoice, $request->input('reason'), $request->user()?->id);
        return new InvoiceResource($updated->load(['items.product', 'partner', 'warehouse', 'payments']));
    }

    public function recordPayment(StorePaymentRequest $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('pay', $invoice);
        $payment = $this->service->recordPayment($invoice, $request->validated(), $request->user()?->id);
        $invoice->refresh()->load(['items.product', 'partner', 'warehouse', 'payments']);
        return response()->json([
            'data' => [
                'payment_id' => $payment->id,
                'invoice'    => new InvoiceResource($invoice),
            ],
        ]);
    }

    public function deletePayment(Request $request, Invoice $invoice, InvoicePayment $payment): JsonResponse
    {
        $this->authorize('pay', $invoice);
        if ($payment->invoice_id !== $invoice->id) abort(404);
        $this->service->deletePayment($payment);
        $invoice->refresh()->load(['items.product', 'partner', 'warehouse', 'payments']);
        return response()->json(['data' => new InvoiceResource($invoice)]);
    }
}
