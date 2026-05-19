<?php

namespace Modules\Quotation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Quotation\Http\Requests\StoreQuotationRequest;
use Modules\Quotation\Http\Resources\QuotationResource;
use Modules\Quotation\Models\Quotation;
use Modules\Quotation\Services\QuotationService;
use Modules\Sales\Services\SalesOrderService;

class QuotationController extends Controller
{
    public function __construct(private QuotationService $service)
    {
        $this->authorizeResource(Quotation::class, 'quotation');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return QuotationResource::collection($this->service->paginate($request->only(['search', 'status', 'partner_id', 'per_page'])));
    }

    public function store(StoreQuotationRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $q = $this->service->create($companyId, [
            'code'                 => $data['code'] ?? null,
            'partner_id'           => $data['partner_id'],
            'quotation_date'       => $data['quotation_date'] ?? now()->toDateString(),
            'valid_until'          => $data['valid_until'] ?? null,
            'reference'            => $data['reference'] ?? null,
            'currency'             => $data['currency'] ?? 'INR',
            'exchange_rate'        => $data['exchange_rate'] ?? 1,
            'tax_type'              => $data['tax_type'] ?? 'cgst_sgst',
            'discount'             => $data['discount'] ?? 0,
            'shipping'             => $data['shipping'] ?? 0,
            'terms_and_conditions' => $data['terms_and_conditions'] ?? null,
            'notes'                => $data['notes'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new QuotationResource($q))->response()->setStatusCode(201);
    }

    public function show(Quotation $quotation): QuotationResource
    {
        $quotation->load(['items.product', 'partner']);
        return new QuotationResource($quotation);
    }

    public function pdf(Quotation $quotation, \Modules\Templates\Services\TemplateService $tpl, \Modules\Templates\Services\PdfService $pdf, \Illuminate\Http\Request $request)
    {
        abort_unless($request->user()?->can('document.pdf.download'), 403, 'Forbidden');
        $html = $tpl->renderModel('quotation', $quotation);
        $template = $tpl->resolveTemplate((int) $quotation->company_id, 'quotation');
        return $pdf->download($html, str_replace('/', '-', "quotation-{$quotation->code}.pdf"), $template->paper_size, $template->orientation);
    }

    public function update(StoreQuotationRequest $request, Quotation $quotation): QuotationResource
    {
        $data = $request->validated();
        $updated = $this->service->update($quotation, $data, $data['lines'] ?? null, $request->user()?->id);
        return new QuotationResource($updated->load(['items.product', 'partner']));
    }

    public function destroy(Quotation $quotation): JsonResponse
    {
        $this->service->delete($quotation);
        return response()->json(['data' => ['message' => 'Quotation deleted.']]);
    }

    public function approve(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('approve', $quotation);
        $updated = $this->service->approve($quotation, $request->user()?->id);
        return new QuotationResource($updated->load(['items.product', 'partner']));
    }

    public function cancel(Request $request, Quotation $quotation): QuotationResource
    {
        $this->authorize('approve', $quotation);
        $updated = $this->service->cancel($quotation, $request->input('reason'), $request->user()?->id);
        return new QuotationResource($updated->load(['items.product', 'partner']));
    }

    public function convert(Request $request, Quotation $quotation, SalesOrderService $sales): JsonResponse
    {
        $this->authorize('convert', $quotation);
        if ($quotation->status !== Quotation::STATUS_APPROVED) {
            abort(422, 'Only approved quotations can be converted to a sales order.');
        }
        $so = $sales->createFromQuotation($quotation, $request->user()?->id);
        $quotation->forceFill([
            'status' => Quotation::STATUS_CONVERTED,
            'converted_to_sales_order_id' => $so->id,
            'converted_at' => now(),
        ])->save();

        return response()->json([
            'data' => [
                'message' => "Converted to sales order {$so->code}.",
                'sales_order_id' => $so->id,
                'sales_order_code' => $so->code,
                'quotation' => new QuotationResource($quotation->load(['items.product', 'partner'])),
            ],
        ]);
    }
}
