<?php

namespace Modules\Reports\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Reports\Services\ReportPdfService;
use Modules\Reports\Services\ReportService;
use Modules\Templates\Services\PdfService;
use Symfony\Component\HttpFoundation\Response;

class ReportController extends Controller
{
    public function __construct(private ReportService $service) {}

    private function check(Request $request): int
    {
        if (! $request->user()?->can('report.view')) abort(403);
        return app()->bound('active_company_id') ? app('active_company_id') : 0;
    }

    public function salesRegister(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->salesRegister($cid, $request->input('from', now()->startOfMonth()->toDateString()), $request->input('to', now()->toDateString()), $request->input('partner_id'))]);
    }

    public function purchaseRegister(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->purchaseRegister($cid, $request->input('from', now()->startOfMonth()->toDateString()), $request->input('to', now()->toDateString()), $request->input('partner_id'))]);
    }

    public function stockSummary(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->stockSummary($cid, $request->input('warehouse_id'))]);
    }

    public function productionSummary(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->productionSummary($cid, $request->input('from', now()->startOfMonth()->toDateString()), $request->input('to', now()->toDateString()))]);
    }

    public function paymentsReceivable(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->paymentsReceivable($cid, $request->input('as_of', now()->toDateString()))]);
    }

    public function paymentsPayable(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->paymentsPayable($cid, $request->input('as_of', now()->toDateString()))]);
    }

    public function profitAndLoss(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->profitAndLoss($cid, $request->input('from', now()->startOfMonth()->toDateString()), $request->input('to', now()->toDateString()))]);
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->balanceSheet($cid, $request->input('as_of', now()->toDateString()))]);
    }

    public function exportRealization(Request $request): JsonResponse
    {
        $cid = $this->check($request);
        return response()->json(['data' => $this->service->exportRealization($cid, $request->input('from', now()->startOfMonth()->toDateString()), $request->input('to', now()->toDateString()))]);
    }

    /**
     * Render any of the 9 reports to a downloadable PDF.
     * Route: GET /api/v1/reports/{code}/pdf?from=&to=&as_of=&partner_id=&warehouse_id=
     */
    public function pdf(Request $request, string $code, ReportPdfService $reportPdf, PdfService $pdf): Response
    {
        $cid = $this->check($request);
        $params = $request->only(['from', 'to', 'as_of', 'partner_id', 'warehouse_id']);
        try {
            $html = $reportPdf->render($cid, $code, $params);
        } catch (\InvalidArgumentException $e) {
            abort(404, $e->getMessage());
        }
        return $pdf->download($html, $reportPdf->downloadFilename($code, $params), 'a4', 'landscape');
    }
}
