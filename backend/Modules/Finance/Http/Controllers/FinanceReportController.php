<?php

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Companies\Models\Company;
use Modules\Finance\Models\Account;
use Modules\Finance\Services\BalanceService;
use Modules\Templates\Services\PdfService;
use Symfony\Component\HttpFoundation\Response;

class FinanceReportController extends Controller
{
    public function __construct(private BalanceService $balances) {}

    public function trialBalance(Request $request): JsonResponse
    {
        if (! $request->user()?->can('finance.report.view')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $from = (string) $request->input('from', now()->startOfMonth()->toDateString());
        $to   = (string) $request->input('to',   now()->toDateString());
        return response()->json(['data' => [
            'from' => $from, 'to' => $to,
            'rows' => $this->balances->trialBalance($companyId, $from, $to),
        ]]);
    }

    public function ledger(Request $request, int $accountId): JsonResponse
    {
        if (! $request->user()?->can('finance.report.view')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $from = (string) $request->input('from', now()->startOfMonth()->toDateString());
        $to   = (string) $request->input('to',   now()->toDateString());
        return response()->json(['data' => $this->balances->ledger($companyId, $accountId, $from, $to)]);
    }

    public function ledgerPdf(Request $request, int $accountId, PdfService $pdf): Response
    {
        if (! $request->user()?->can('finance.report.view')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $from = (string) $request->input('from', now()->startOfMonth()->toDateString());
        $to   = (string) $request->input('to',   now()->toDateString());
        $data = $this->balances->ledger($companyId, $accountId, $from, $to);
        $company = Company::find($companyId);
        $account = Account::find($accountId);
        $html = $this->ledgerHtml($company, $account, $from, $to, $data);
        $name = $account ? preg_replace('/[^A-Za-z0-9-]/', '_', $account->code) : 'unknown';
        return $pdf->download($html, "ledger-{$name}-{$from}-to-{$to}.pdf", 'a4', 'portrait');
    }

    private function ledgerHtml(?Company $company, ?Account $account, string $from, string $to, array $data): string
    {
        $companyName = $company ? e($company->name) : '—';
        $acctName    = $account ? e($account->code . ' — ' . $account->name) : '—';
        $rowsHtml = '';
        foreach ($data['rows'] ?? [] as $r) {
            $debit  = ($r['debit']  ?? 0) > 0 ? number_format($r['debit'], 2)  : '';
            $credit = ($r['credit'] ?? 0) > 0 ? number_format($r['credit'], 2) : '';
            $rowsHtml .= '<tr>'
                . '<td>' . e($r['entry_date'] ?? '') . '</td>'
                . '<td>' . e($r['entry_code'] ?? '') . '</td>'
                . '<td>' . e($r['reference_no'] ?? '') . '</td>'
                . '<td>' . e($r['narration'] ?? '') . '</td>'
                . '<td class="num">' . $debit . '</td>'
                . '<td class="num">' . $credit . '</td>'
                . '<td class="num"><strong>' . number_format($r['balance'] ?? 0, 2) . '</strong></td>'
                . '</tr>';
        }
        if ($rowsHtml === '') {
            $rowsHtml = '<tr><td colspan="7" style="text-align:center;color:#999;padding:18px">No movements in this period.</td></tr>';
        }
        $opening = number_format((float) ($data['opening'] ?? 0), 2);
        $closing = number_format((float) ($data['closing'] ?? 0), 2);
        $today = date('Y-m-d H:i');

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
</style></head><body>
<h1>Account Ledger</h1>
<div class="meta">
  <strong>{$companyName}</strong> &middot; {$acctName} &middot; Period: {$from} to {$to} &middot; Generated {$today}
</div>
<div class="summary">
  <span>Opening: <strong>{$opening}</strong></span>
  <span>Closing: <strong>{$closing}</strong></span>
</div>
<table>
  <thead>
    <tr>
      <th>Date</th><th>JE #</th><th>Ref #</th><th>Narration</th>
      <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
    </tr>
  </thead>
  <tbody>{$rowsHtml}</tbody>
</table>
</body></html>
HTML;
    }
}
