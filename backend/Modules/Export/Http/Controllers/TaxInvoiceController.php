<?php

namespace Modules\Export\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Export\Http\Requests\StoreTaxInvoiceRequest;
use Modules\Export\Http\Resources\TaxInvoiceResource;
use Modules\Export\Models\TaxInvoice;
use Modules\Export\Services\TaxInvoiceService;

class TaxInvoiceController extends Controller
{
    public function __construct(private TaxInvoiceService $service)
    {
        $this->authorizeResource(TaxInvoice::class, 'taxInvoice');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return TaxInvoiceResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'export_invoice_id', 'per_page']))
        );
    }

    public function store(StoreTaxInvoiceRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $ti = $this->service->create($companyId, $this->headerFromRequest($data), $data['lines'], $request->user()?->id);
        return (new TaxInvoiceResource($ti))->response()->setStatusCode(201);
    }

    public function show(TaxInvoice $taxInvoice): TaxInvoiceResource
    {
        $taxInvoice->load(['items.product', 'partner', 'consignee', 'exportInvoice']);
        return new TaxInvoiceResource($taxInvoice);
    }

    public function pdf(TaxInvoice $taxInvoice, \Modules\Templates\Services\TemplateService $tpl, \Modules\Templates\Services\PdfService $pdf, \Illuminate\Http\Request $request)
    {
        abort_unless($request->user()?->can('document.pdf.download'), 403, 'Forbidden');
        $html = $tpl->renderModel('tax_invoice', $taxInvoice);
        $template = $tpl->resolveTemplate((int) $taxInvoice->company_id, 'tax_invoice');
        return $pdf->download($html, str_replace('/', '-', "tax-invoice-{$taxInvoice->code}.pdf"), $template->paper_size, $template->orientation);
    }

    public function update(StoreTaxInvoiceRequest $request, TaxInvoice $taxInvoice): TaxInvoiceResource
    {
        $data = $request->validated();
        $updated = $this->service->update($taxInvoice, $this->headerFromRequest($data), $data['lines'] ?? null, $request->user()?->id);
        return new TaxInvoiceResource($updated->load(['items.product', 'partner', 'consignee', 'exportInvoice']));
    }

    public function destroy(TaxInvoice $taxInvoice): JsonResponse
    {
        $this->service->delete($taxInvoice);
        return response()->json(['data' => ['message' => 'Tax invoice deleted.']]);
    }

    public function post(Request $request, TaxInvoice $taxInvoice): TaxInvoiceResource
    {
        $this->authorize('post', $taxInvoice);
        return new TaxInvoiceResource($this->service->post($taxInvoice, $request->user()?->id)->load(['items.product', 'partner', 'consignee', 'exportInvoice']));
    }

    public function cancel(Request $request, TaxInvoice $taxInvoice): TaxInvoiceResource
    {
        $this->authorize('post', $taxInvoice);
        return new TaxInvoiceResource($this->service->cancel($taxInvoice, $request->input('reason'), $request->user()?->id)->load(['items.product', 'partner', 'consignee', 'exportInvoice']));
    }

    private function headerFromRequest(array $data): array
    {
        return [
            'code'                      => $data['code'] ?? null,
            'export_invoice_id'         => $data['export_invoice_id'],
            'partner_id'                => $data['partner_id'],
            'invoice_date'              => $data['invoice_date'],
            'date_of_supply'            => $data['date_of_supply'] ?? null,
            'reference'                 => $data['reference'] ?? null,
            'currency'                  => $data['currency'],
            'exchange_rate'             => $data['exchange_rate'],
            'transport_mode'            => $data['transport_mode'] ?? null,
            'incoterm'                  => $data['incoterm'] ?? null,
            'lut_no'                    => $data['lut_no'] ?? null,
            'lut_date'                  => $data['lut_date'] ?? null,
            'tax_details'               => $data['tax_details'] ?? null,
            'customs_notification_no'   => $data['customs_notification_no'] ?? null,
            'customs_notification_date' => $data['customs_notification_date'] ?? null,
            'gstin_supplier'            => $data['gstin_supplier'] ?? null,
            'gstin_recipient'           => $data['gstin_recipient'] ?? null,
            'place_of_supply'           => $data['place_of_supply'] ?? null,
            'consignee_partner_id'      => $data['consignee_partner_id'] ?? null,
            'consignee_name'            => $data['consignee_name'] ?? null,
            'consignee_address'         => $data['consignee_address'] ?? null,
            'consignee_country'         => $data['consignee_country'] ?? null,
            'consignee_contact_person'  => $data['consignee_contact_person'] ?? null,
            'consignee_phone'           => $data['consignee_phone'] ?? null,
            'consignee_email'           => $data['consignee_email'] ?? null,
            'consignee_registration_no' => $data['consignee_registration_no'] ?? null,
            'notify_party_name'         => $data['notify_party_name'] ?? null,
            'notify_party_address'      => $data['notify_party_address'] ?? null,
            'port_of_loading'           => $data['port_of_loading'] ?? null,
            'port_of_discharge'         => $data['port_of_discharge'] ?? null,
            'loading_destination'       => $data['loading_destination'] ?? null,
            'final_destination'         => $data['final_destination'] ?? null,
            'payment_terms'             => $data['payment_terms'] ?? null,
            'tax_type'                  => $data['tax_type'] ?? 'igst',
            'discount'                  => $data['discount'] ?? 0,
            'shipping'                  => $data['shipping'] ?? 0,
            'freight_charge'            => $data['freight_charge'] ?? 0,
            'packaging_charge'          => $data['packaging_charge'] ?? 0,
            'development_charge'        => $data['development_charge'] ?? 0,
            'terms_and_conditions'      => $data['terms_and_conditions'] ?? null,
            'notes'                     => $data['notes'] ?? null,
        ];
    }
}
