<?php

namespace Modules\Export\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Export\Http\Requests\StoreExportInvoiceRequest;
use Modules\Export\Http\Resources\ExportInvoiceResource;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Services\ExportInvoiceService;

class ExportInvoiceController extends Controller
{
    public function __construct(private ExportInvoiceService $service)
    {
        $this->authorizeResource(ExportInvoice::class, 'invoice');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return ExportInvoiceResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'partner_id', 'per_page']))
        );
    }

    public function store(StoreExportInvoiceRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $ei = $this->service->create($companyId, [
            'code'                   => $data['code'] ?? null,
            'partner_id'             => $data['partner_id'],
            'sales_order_id'         => $data['sales_order_id'] ?? null,
            'invoice_date'           => $data['invoice_date'],
            'date_of_supply'         => $data['date_of_supply'] ?? null,
            'due_date'               => $data['due_date'] ?? null,
            'reference'              => $data['reference'] ?? null,
            'currency'               => $data['currency'] ?? 'USD',
            'exchange_rate'          => $data['exchange_rate'] ?? 1,
            'tax_type'               => $data['tax_type'] ?? 'igst',
            'incoterm'               => $data['incoterm'] ?? 'FOB',
            'transport_mode'         => $data['transport_mode'] ?? null,
            'lut_no'                 => $data['lut_no'] ?? null,
            'lut_date'               => $data['lut_date'] ?? null,
            'tax_details'            => $data['tax_details'] ?? null,
            'consignee_partner_id'       => $data['consignee_partner_id'] ?? null,
            'consignee_name'             => $data['consignee_name'] ?? null,
            'consignee_address'          => $data['consignee_address'] ?? null,
            'consignee_country'          => $data['consignee_country'] ?? null,
            'consignee_contact_person'   => $data['consignee_contact_person'] ?? null,
            'consignee_phone'            => $data['consignee_phone'] ?? null,
            'consignee_email'            => $data['consignee_email'] ?? null,
            'consignee_registration_no'  => $data['consignee_registration_no'] ?? null,
            'notify_party_name'      => $data['notify_party_name'] ?? null,
            'notify_party_address'   => $data['notify_party_address'] ?? null,
            'port_of_loading'        => $data['port_of_loading'] ?? null,
            'port_of_discharge'      => $data['port_of_discharge'] ?? null,
            'loading_destination'    => $data['loading_destination'] ?? null,
            'final_destination'      => $data['final_destination'] ?? null,
            'country_of_destination' => $data['country_of_destination'] ?? null,
            'payment_terms'          => $data['payment_terms'] ?? null,
            'discount'               => $data['discount'] ?? 0,
            'shipping'               => $data['shipping'] ?? 0,
            'freight_charge'         => $data['freight_charge'] ?? 0,
            'packaging_charge'       => $data['packaging_charge'] ?? 0,
            'development_charge'     => $data['development_charge'] ?? 0,
            'terms_and_conditions'   => $data['terms_and_conditions'] ?? null,
            'notes'                  => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new ExportInvoiceResource($ei))->response()->setStatusCode(201);
    }

    public function show(ExportInvoice $invoice): ExportInvoiceResource
    {
        $invoice->load(['items.product', 'partner', 'consignee', 'shippingBills', 'packingLists:id,export_invoice_id,code,status,pl_date', 'taxInvoices:id,export_invoice_id,code,status,invoice_date,total_inr']);
        return new ExportInvoiceResource($invoice);
    }

    public function pdf(ExportInvoice $invoice, \Modules\Templates\Services\TemplateService $tpl, \Modules\Templates\Services\PdfService $pdf, \Illuminate\Http\Request $request)
    {
        abort_unless($request->user()?->can('document.pdf.download'), 403, 'Forbidden');
        $html = $tpl->renderModel('export_invoice', $invoice);
        $template = $tpl->resolveTemplate((int) $invoice->company_id, 'export_invoice');
        return $pdf->download($html, str_replace('/', '-', "export-invoice-{$invoice->code}.pdf"), $template->paper_size, $template->orientation);
    }

    public function update(StoreExportInvoiceRequest $request, ExportInvoice $invoice): ExportInvoiceResource
    {
        $data = $request->validated();
        $updated = $this->service->update($invoice, $data, $data['lines'] ?? null, $request->user()?->id);
        return new ExportInvoiceResource($updated->load(['items.product', 'partner', 'consignee', 'shippingBills', 'packingLists:id,export_invoice_id,code,status,pl_date', 'taxInvoices:id,export_invoice_id,code,status,invoice_date,total_inr']));
    }

    public function destroy(ExportInvoice $invoice): JsonResponse
    {
        $this->service->delete($invoice);
        return response()->json(['data' => ['message' => 'Export invoice deleted.']]);
    }

    public function post(Request $request, ExportInvoice $invoice): ExportInvoiceResource
    {
        $this->authorize('post', $invoice);
        $updated = $this->service->post($invoice, $request->user()?->id);
        return new ExportInvoiceResource($updated->load(['items.product', 'partner', 'consignee', 'shippingBills', 'packingLists:id,export_invoice_id,code,status,pl_date', 'taxInvoices:id,export_invoice_id,code,status,invoice_date,total_inr']));
    }

    public function cancel(Request $request, ExportInvoice $invoice): ExportInvoiceResource
    {
        $this->authorize('post', $invoice);
        $updated = $this->service->cancel($invoice, $request->input('reason'), $request->user()?->id);
        return new ExportInvoiceResource($updated->load(['items.product', 'partner', 'consignee', 'shippingBills', 'packingLists:id,export_invoice_id,code,status,pl_date', 'taxInvoices:id,export_invoice_id,code,status,invoice_date,total_inr']));
    }

    /**
     * Ensure both companion documents (Packing List + Tax Invoice) exist for this EI.
     * Idempotent — re-runnable without creating duplicates.
     */
    public function ensureCompanionDocs(Request $request, ExportInvoice $invoice): ExportInvoiceResource
    {
        $this->authorize('view', $invoice);
        $updated = $this->service->ensureCompanionDocs($invoice, $request->user()?->id);
        return new ExportInvoiceResource($updated->load(['items.product', 'partner', 'consignee', 'shippingBills', 'packingLists:id,export_invoice_id,code,status,pl_date', 'taxInvoices:id,export_invoice_id,code,status,invoice_date,total_inr']));
    }
}
