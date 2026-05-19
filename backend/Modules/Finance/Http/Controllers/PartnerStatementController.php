<?php

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Companies\Models\Company;
use Modules\Crm\Models\Partner;
use Modules\Finance\Services\PartnerStatementService;
use Modules\Templates\Services\PdfService;
use Symfony\Component\HttpFoundation\Response;

class PartnerStatementController extends Controller
{
    public function __construct(private PartnerStatementService $service) {}

    public function show(Request $request, Partner $partner): JsonResponse
    {
        if (! $request->user()?->can('finance.report.view')) abort(403);

        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $from = (string) $request->input('from', now()->subDays(90)->toDateString());
        $to   = (string) $request->input('to',   now()->toDateString());

        return response()->json(['data' => $this->service->build($companyId, $partner, $from, $to)]);
    }

    public function pdf(Request $request, Partner $partner, PdfService $pdf): Response
    {
        if (! $request->user()?->can('finance.report.view')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $from = (string) $request->input('from', now()->subDays(90)->toDateString());
        $to   = (string) $request->input('to',   now()->toDateString());

        $stmt = $this->service->build($companyId, $partner, $from, $to);
        $company = Company::find($companyId);
        $html = $this->renderHtml($company, $stmt);
        $filename = 'statement-' . preg_replace('/[^A-Za-z0-9-]/', '_', $partner->code) . '-' . $from . '-to-' . $to . '.pdf';
        return $pdf->download($html, $filename, 'a4', 'portrait');
    }

    private function renderHtml(?Company $company, array $s): string
    {
        $companyName = $company ? e($company->name) : '—';
        $p = $s['partner'];
        $period = $s['period'];
        $rowsHtml = '';
        foreach ($s['rows'] as $r) {
            $debit  = $r['debit']  > 0 ? number_format($r['debit'], 2)  : '';
            $credit = $r['credit'] > 0 ? number_format($r['credit'], 2) : '';
            $rowsHtml .= '<tr>'
                . '<td>' . e($r['date']) . '</td>'
                . '<td>' . e($r['type']) . '</td>'
                . '<td>' . e($r['ref_code']) . '</td>'
                . '<td>' . e($r['narration']) . '</td>'
                . '<td class="num">' . $debit . '</td>'
                . '<td class="num">' . $credit . '</td>'
                . '<td class="num"><strong>' . number_format($r['running_balance'], 2) . '</strong></td>'
                . '</tr>';
        }
        if ($rowsHtml === '') {
            $rowsHtml = '<tr><td colspan="7" style="text-align:center;color:#999;padding:18px">No transactions in this period.</td></tr>';
        }
        $openingFmt = number_format($s['opening_balance'], 2);
        $closingFmt = number_format($s['closing_balance'], 2);
        $totDr = number_format($s['totals']['total_debit'], 2);
        $totCr = number_format($s['totals']['total_credit'], 2);

        return <<<HTML
<!doctype html>
<html><head><meta charset="utf-8"><style>
body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #111; }
h1 { font-size: 18px; margin: 0 0 4px 0; }
.meta { font-size: 10px; color: #666; margin-bottom: 10px; }
.summary { margin: 8px 0; }
.summary span { display:inline-block; margin-right:20px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 4px 6px; vertical-align: top; }
th { background: #f3f4f6; font-weight: 600; text-align: left; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.totals td { background: #fafafa; font-weight: 700; }
</style></head><body>
<h1>Partner Statement</h1>
<div class="meta">
  <strong>{$companyName}</strong> &middot; {$p['code']} — {$p['name']} ({$p['type']})
  &middot; Period: {$period['from']} to {$period['to']}
  &middot; Generated {$this->today()}
</div>
<div class="summary">
  <span>Opening: <strong>{$openingFmt}</strong></span>
  <span>Total debit: <strong>{$totDr}</strong></span>
  <span>Total credit: <strong>{$totCr}</strong></span>
  <span>Closing: <strong>{$closingFmt}</strong></span>
</div>
<table>
  <thead>
    <tr>
      <th>Date</th><th>Type</th><th>Ref #</th><th>Narration</th>
      <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
    </tr>
  </thead>
  <tbody>{$rowsHtml}</tbody>
  <tfoot>
    <tr class="totals">
      <td colspan="4">Totals (period)</td>
      <td class="num">{$totDr}</td>
      <td class="num">{$totCr}</td>
      <td class="num">{$closingFmt}</td>
    </tr>
  </tfoot>
</table>
</body></html>
HTML;
    }

    private function today(): string { return date('Y-m-d H:i'); }
}
