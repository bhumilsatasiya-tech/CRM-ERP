<?php

namespace Modules\Purchase\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Purchase\Http\Requests\StorePurchaseInvoiceRequest;
use Modules\Purchase\Http\Resources\PurchaseInvoiceResource;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Purchase\Models\PurchaseInvoicePayment;
use Modules\Purchase\Services\PurchaseService;

class PurchaseInvoiceController extends Controller
{
    public function __construct(private PurchaseService $service)
    {
        $this->authorizeResource(PurchaseInvoice::class, 'invoice');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return PurchaseInvoiceResource::collection($this->service->paginatePI($request->only(['search', 'status', 'per_page'])));
    }

    public function store(StorePurchaseInvoiceRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $pi = $this->service->createPI($companyId, [
            'code'               => $data['code'] ?? null,
            'partner_id'         => $data['partner_id'],
            'purchase_order_id'  => $data['purchase_order_id'] ?? null,
            'grn_id'             => $data['grn_id'] ?? null,
            'supplier_invoice_no'=> $data['supplier_invoice_no'] ?? null,
            'invoice_date'       => $data['invoice_date'],
            'due_date'           => $data['due_date'] ?? null,
            'currency'           => $data['currency'] ?? 'INR',
            'exchange_rate'      => $data['exchange_rate'] ?? 1,
            'tax_type'              => $data['tax_type'] ?? 'cgst_sgst',
            'discount'           => $data['discount'] ?? 0,
            'shipping'           => $data['shipping'] ?? 0,
            'notes'              => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new PurchaseInvoiceResource($pi))->response()->setStatusCode(201);
    }

    public function show(PurchaseInvoice $invoice): PurchaseInvoiceResource
    {
        $invoice->load(['items.product', 'partner']);
        return new PurchaseInvoiceResource($invoice);
    }

    public function update(StorePurchaseInvoiceRequest $request, PurchaseInvoice $invoice): PurchaseInvoiceResource
    {
        $data = $request->validated();
        $updated = $this->service->updatePI($invoice, $data, $data['lines'] ?? null, $request->user()?->id);
        return new PurchaseInvoiceResource($updated->load(['items.product', 'partner']));
    }

    public function destroy(PurchaseInvoice $invoice): JsonResponse
    {
        $this->service->deletePI($invoice);
        return response()->json(['data' => ['message' => 'Purchase invoice deleted.']]);
    }

    public function post(Request $request, PurchaseInvoice $invoice): PurchaseInvoiceResource
    {
        $this->authorize('post', $invoice);
        $updated = $this->service->postPI($invoice, $request->user()?->id);
        return new PurchaseInvoiceResource($updated->load(['items.product', 'partner']));
    }

    public function cancel(Request $request, PurchaseInvoice $invoice): PurchaseInvoiceResource
    {
        $this->authorize('post', $invoice);
        $updated = $this->service->cancelPI($invoice, $request->input('reason'), $request->user()?->id);
        return new PurchaseInvoiceResource($updated->load(['items.product', 'partner']));
    }

    /** Record a single payment against ONE purchase invoice. */
    public function recordPayment(Request $request, PurchaseInvoice $invoice): JsonResponse
    {
        $this->authorize('post', $invoice);
        $data = $request->validate([
            'amount'        => ['required', 'numeric', 'gt:0'],
            'payment_date'  => ['nullable', 'date'],
            'mode'          => ['nullable', 'string', 'max:32'],
            'reference'     => ['nullable', 'string', 'max:128'],
            'currency'      => ['nullable', 'string', 'max:8'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'notes'         => ['nullable', 'string'],
        ]);
        $payment = $this->service->recordPIPayment($invoice, $data, $request->user()?->id);
        $invoice->refresh()->load(['items.product', 'partner']);
        return response()->json(['data' => [
            'payment' => $payment,
            'invoice' => new PurchaseInvoiceResource($invoice),
        ]]);
    }

    /** Delete a single payment row + revert the parent invoice balance. */
    public function deletePayment(Request $request, PurchaseInvoice $invoice, PurchaseInvoicePayment $payment): JsonResponse
    {
        $this->authorize('post', $invoice);
        if ($payment->purchase_invoice_id !== $invoice->id) abort(404);
        $this->service->deletePIPayment($payment);
        $invoice->refresh()->load(['items.product', 'partner']);
        return response()->json(['data' => ['invoice' => new PurchaseInvoiceResource($invoice)]]);
    }
}
