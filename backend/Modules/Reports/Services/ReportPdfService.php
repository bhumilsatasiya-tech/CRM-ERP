<?php

namespace Modules\Reports\Services;

use Modules\Companies\Models\Company;

class ReportPdfService
{
    public function __construct(private ReportService $reports) {}

    /**
     * Render any of the report endpoints to PDF-ready HTML.
     *
     * Handles four shapes:
     *  - { rows: [...], totals: {...} }                                  — register/aging style
     *  - { income: [...], expense: [...], net_profit: x }                — P&L
     *  - { assets: [...], liabilities: [...], equity: [...], totals }    — Balance Sheet
     *  - flat array (stock_summary)                                      — fall through to single table
     */
    public function render(int $companyId, string $code, array $params): string
    {
        $title = $this->titleFor($code);
        $payload = $this->fetch($companyId, $code, $params);
        $company = Company::find($companyId);

        $header = $this->headerHtml($company, $title, $params);
        $body   = $this->bodyHtml($code, $payload);

        return <<<HTML
<!doctype html>
<html><head><meta charset="utf-8"><style>
body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #111; }
h1 { font-size: 18px; margin: 0 0 4px 0; }
h2 { font-size: 13px; margin: 14px 0 4px 0; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
.meta { font-size: 10px; color: #666; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #f3f4f6; font-weight: 600; text-transform: capitalize; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
tr.total td { background: #fafafa; font-weight: 700; }
.summary { margin-top: 4px; font-size: 11px; }
.summary span { display: inline-block; margin-right: 18px; }
.summary strong { color: #111; }
</style></head><body>
{$header}
{$body}
</body></html>
HTML;
    }

    public function downloadFilename(string $code, array $params): string
    {
        $stamp = isset($params['as_of']) ? (string) $params['as_of']
              : (isset($params['from'], $params['to']) ? "{$params['from']}_to_{$params['to']}" : date('Y-m-d'));
        return "report-{$code}-{$stamp}.pdf";
    }

    private function fetch(int $companyId, string $code, array $params): array
    {
        $from = $params['from'] ?? now()->startOfMonth()->toDateString();
        $to   = $params['to']   ?? now()->toDateString();
        $asOf = $params['as_of'] ?? now()->toDateString();
        $partnerId   = $params['partner_id']   ?? null;
        $warehouseId = $params['warehouse_id'] ?? null;

        return match ($code) {
            'sales-register'      => $this->reports->salesRegister($companyId, $from, $to, $partnerId),
            'purchase-register'   => $this->reports->purchaseRegister($companyId, $from, $to, $partnerId),
            'stock-summary'       => ['rows' => $this->reports->stockSummary($companyId, $warehouseId)],
            'production-summary'  => $this->reports->productionSummary($companyId, $from, $to),
            'payments-receivable' => $this->reports->paymentsReceivable($companyId, $asOf),
            'payments-payable'    => $this->reports->paymentsPayable($companyId, $asOf),
            'profit-and-loss'     => $this->reports->profitAndLoss($companyId, $from, $to),
            'balance-sheet'       => $this->reports->balanceSheet($companyId, $asOf),
            'export-realization'  => $this->reports->exportRealization($companyId, $from, $to),
            default               => throw new \InvalidArgumentException("Unknown report: {$code}"),
        };
    }

    private function titleFor(string $code): string
    {
        $map = [
            'sales-register'      => 'Sales Register',
            'purchase-register'   => 'Purchase Register',
            'stock-summary'       => 'Stock Summary',
            'production-summary'  => 'Production Summary',
            'payments-receivable' => 'Payments Receivable (AR Aging)',
            'payments-payable'    => 'Payments Payable (AP Aging)',
            'profit-and-loss'     => 'Profit & Loss',
            'balance-sheet'       => 'Balance Sheet',
            'export-realization'  => 'Export Realization',
        ];
        return $map[$code] ?? ucfirst(str_replace('-', ' ', $code));
    }

    private function headerHtml(?Company $company, string $title, array $params): string
    {
        $company_name = $company ? e($company->name) : '—';
        $range = isset($params['as_of'])
            ? 'As of ' . e($params['as_of'])
            : (isset($params['from'], $params['to']) ? e($params['from']) . ' to ' . e($params['to']) : '');

        return <<<HTML
<h1>{$title}</h1>
<div class="meta"><strong>{$company_name}</strong>{$this->maybeRange($range)} &middot; Generated {$this->today()}</div>
HTML;
    }

    private function maybeRange(string $range): string
    {
        return $range === '' ? '' : ' &middot; ' . $range;
    }

    private function today(): string { return date('Y-m-d H:i'); }

    /** PHP 8.0 compat: array_is_list() is 8.1+. */
    private function isList(array $arr): bool
    {
        if ($arr === []) return true;
        return array_keys($arr) === range(0, count($arr) - 1);
    }

    private function bodyHtml(string $code, array $payload): string
    {
        // P&L
        if (isset($payload['income']) && isset($payload['expense'])) {
            return $this->plHtml($payload);
        }
        // Balance Sheet
        if (isset($payload['assets']) && isset($payload['liabilities'])) {
            return $this->bsHtml($payload);
        }
        // Default: rows + optional totals
        $rows = $payload['rows'] ?? (is_array($payload) && $this->isList($payload) ? $payload : []);
        $totals = $payload['totals'] ?? null;
        $html = $this->tableHtml((array) $rows);
        if (is_array($totals) && !empty($totals)) $html .= $this->totalsHtml($totals);
        return $html;
    }

    private function plHtml(array $p): string
    {
        $net = isset($p['net_profit']) ? number_format((float) $p['net_profit'], 2) : '—';
        $income = $this->tableHtml((array) ($p['income'] ?? []));
        $expense = $this->tableHtml((array) ($p['expense'] ?? []));
        return "<h2>Income</h2>{$income}<h2>Expense</h2>{$expense}<div class='summary'><span>Net profit: <strong>{$net}</strong></span></div>";
    }

    private function bsHtml(array $p): string
    {
        $assets = $this->tableHtml((array) ($p['assets'] ?? []));
        $liab   = $this->tableHtml((array) ($p['liabilities'] ?? []));
        $equity = $this->tableHtml((array) ($p['equity'] ?? []));
        $totals = is_array($p['totals'] ?? null) ? $this->totalsHtml($p['totals']) : '';
        return "<h2>Assets</h2>{$assets}<h2>Liabilities</h2>{$liab}<h2>Equity</h2>{$equity}{$totals}";
    }

    private function tableHtml(array $rows): string
    {
        if (empty($rows)) return "<p style='color:#999'>No rows.</p>";
        $first = (array) reset($rows);
        $cols = array_keys($first);
        $isNumCol = [];
        foreach ($cols as $c) {
            $isNumCol[$c] = is_numeric($first[$c] ?? null) && !is_string($first[$c] ?? null);
        }
        $thead = '<tr>' . implode('', array_map(
            fn($c) => "<th class='" . ($isNumCol[$c] ? 'num' : '') . "'>" . e(str_replace('_', ' ', $c)) . "</th>",
            $cols
        )) . '</tr>';

        $tbody = '';
        foreach ($rows as $r) {
            $r = (array) $r;
            $tbody .= '<tr>';
            foreach ($cols as $c) {
                $v = $r[$c] ?? '';
                if ($isNumCol[$c] && is_numeric($v)) {
                    $tbody .= "<td class='num'>" . number_format((float) $v, 2) . '</td>';
                } else {
                    $tbody .= '<td>' . e((string) $v) . '</td>';
                }
            }
            $tbody .= '</tr>';
        }
        return "<table><thead>{$thead}</thead><tbody>{$tbody}</tbody></table>";
    }

    private function totalsHtml(array $totals): string
    {
        $bits = [];
        foreach ($totals as $k => $v) {
            $val = is_numeric($v) ? number_format((float) $v, 2) : e((string) $v);
            $bits[] = '<span>' . e(str_replace('_', ' ', (string) $k)) . ': <strong>' . $val . '</strong></span>';
        }
        return "<div class='summary'>" . implode('', $bits) . '</div>';
    }
}
