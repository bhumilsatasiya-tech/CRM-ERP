<?php

namespace Modules\InterCompany\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\InterCompany\Http\Requests\StoreInterCompanyInvoiceRequest;
use Modules\InterCompany\Http\Resources\InterCompanyInvoiceResource;
use Modules\InterCompany\Models\InterCompanyInvoice;
use Modules\InterCompany\Services\InterCompanyInvoiceService;

class InterCompanyInvoiceController extends Controller
{
    public function __construct(private InterCompanyInvoiceService $service)
    {
        $this->authorizeResource(InterCompanyInvoice::class, 'invoice');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return InterCompanyInvoiceResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'from_company_id', 'to_company_id', 'per_page']))
        );
    }

    public function store(StoreInterCompanyInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $ici = $this->service->create([
            'code'              => $data['code'] ?? null,
            'from_company_id'   => $data['from_company_id'],
            'to_company_id'     => $data['to_company_id'],
            'from_warehouse_id' => $data['from_warehouse_id'],
            'to_warehouse_id'   => $data['to_warehouse_id'],
            'invoice_date'      => $data['invoice_date'],
            'due_date'          => $data['due_date'] ?? null,
            'currency'          => $data['currency'] ?? 'INR',
            'exchange_rate'     => $data['exchange_rate'] ?? 1,
            'tax_type'          => $data['tax_type'] ?? 'igst',
            'profit_pct'        => $data['profit_pct'] ?? 0,
            'notes'             => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new InterCompanyInvoiceResource($ici))->response()->setStatusCode(201);
    }

    public function show(InterCompanyInvoice $invoice): InterCompanyInvoiceResource
    {
        $invoice->load(['items.product', 'fromCompany', 'toCompany', 'fromWarehouse', 'toWarehouse', 'linkedSaleInvoice', 'linkedPurchaseInvoice']);
        return new InterCompanyInvoiceResource($invoice);
    }

    public function update(StoreInterCompanyInvoiceRequest $request, InterCompanyInvoice $invoice): InterCompanyInvoiceResource
    {
        $data = $request->validated();
        $updated = $this->service->update($invoice, $data, $data['lines'] ?? null, $request->user()?->id);
        return new InterCompanyInvoiceResource($updated);
    }

    public function destroy(InterCompanyInvoice $invoice): JsonResponse
    {
        $this->service->delete($invoice);
        return response()->json(['data' => ['message' => 'Inter-company invoice deleted.']]);
    }

    public function post(Request $request, InterCompanyInvoice $invoice): InterCompanyInvoiceResource
    {
        $this->authorize('post', $invoice);
        $updated = $this->service->post($invoice, $request->user()?->id);
        return new InterCompanyInvoiceResource($updated);
    }

    public function cancel(Request $request, InterCompanyInvoice $invoice): InterCompanyInvoiceResource
    {
        $this->authorize('cancel', $invoice);
        $updated = $this->service->cancel($invoice, $request->input('reason'), $request->user()?->id);
        return new InterCompanyInvoiceResource($updated->load(['items.product', 'fromCompany', 'toCompany', 'fromWarehouse', 'toWarehouse', 'linkedSaleInvoice', 'linkedPurchaseInvoice']));
    }
}
