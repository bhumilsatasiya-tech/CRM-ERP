<?php

namespace Modules\Dashboard\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Companies\Models\Warehouse;
use Modules\Export\Models\ExportInvoice;
use Modules\Finance\Models\JournalEntry;
use Modules\Inventory\Services\StockService;
use Modules\Irm\Models\Irm;
use Modules\Production\Models\ProductionBatch;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Purchase\Models\PurchaseOrder;
use Modules\Sales\Models\Invoice;
use Modules\Tasks\Models\Task;

/**
 * Dashboard KPIs — privacy-first.
 *
 * No partner names, no buyer/supplier identities, no narrations are exposed in this payload.
 * Everything is aggregated to numbers, counts, time-buckets, or warehouse codes (which are
 * internal organizational identifiers, not third-party PII).
 */
class DashboardService
{
    public function __construct(private StockService $stock) {}

    public function kpis(int $companyId, string $from, string $to): array
    {
        return [
            'sales'      => $this->sales($companyId, $from, $to),
            'purchase'   => $this->purchase($companyId, $from, $to),
            'production' => $this->production($companyId, $from, $to),
            'inventory'  => $this->inventory($companyId),
            'export'     => $this->export($companyId, $from, $to),
            'finance'    => $this->finance($companyId),
            'tasks'      => $this->tasks($companyId),
            'trends'     => $this->trends($companyId),
            'activity'   => $this->activity($companyId),
        ];
    }

    private function sales(int $cid, string $from, string $to): array
    {
        $t = Invoice::where('company_id', $cid)->where('status', '!=', 'cancelled')
            ->whereBetween('invoice_date', [$from, $to])
            ->selectRaw('COUNT(*) AS c, SUM(total) AS t, SUM(paid_amount) AS p, SUM(balance) AS b')->first();

        return [
            'invoices_count'    => (int) ($t?->c ?? 0),
            'invoiced_total'    => (float) ($t?->t ?? 0),
            'paid_total'        => (float) ($t?->p ?? 0),
            'outstanding_total' => (float) ($t?->b ?? 0),
        ];
    }

    private function purchase(int $cid, string $from, string $to): array
    {
        $poCount = PurchaseOrder::where('company_id', $cid)->whereBetween('order_date', [$from, $to])->count();
        $pi = PurchaseInvoice::where('company_id', $cid)->where('status', '!=', 'cancelled')
            ->whereBetween('invoice_date', [$from, $to])
            ->selectRaw('COUNT(*) AS c, SUM(total) AS t, SUM(balance) AS b')->first();

        return [
            'pos_count'      => $poCount,
            'pi_count'       => (int) ($pi?->c ?? 0),
            'received_total' => (float) ($pi?->t ?? 0),
            'payable_total'  => (float) ($pi?->b ?? 0),
        ];
    }

    private function production(int $cid, string $from, string $to): array
    {
        $r = ProductionBatch::where('company_id', $cid)->where('status', '!=', 'cancelled')
            ->whereBetween('planned_start_date', [$from, $to])
            ->selectRaw('COUNT(*) AS c, SUM(qty_produced) AS p, SUM(qty_failed) AS f')->first();
        $produced = (float) ($r?->p ?? 0);
        $failed   = (float) ($r?->f ?? 0);
        return [
            'batches_count' => (int) ($r?->c ?? 0),
            'qty_produced'  => $produced,
            'qty_failed'    => $failed,
            'scrap_pct'     => $produced + $failed > 0 ? round($failed * 100 / ($produced + $failed), 2) : 0.0,
        ];
    }

    private function inventory(int $cid): array
    {
        $pivot = $this->stock->currentStockPivot($cid);
        $total = array_sum(array_column($pivot, 'value'));

        // Aggregate value per warehouse — warehouse codes are internal, not PII.
        $byWh = [];
        foreach ($pivot as $row) {
            $whId = $row['warehouse_id'] ?? null;
            if (!$whId) continue;
            $byWh[$whId] = ($byWh[$whId] ?? 0) + (float) ($row['value'] ?? 0);
        }
        $whNames = Warehouse::whereIn('id', array_keys($byWh))->pluck('code', 'id');
        $byWarehouse = [];
        foreach ($byWh as $whId => $value) {
            $byWarehouse[] = ['code' => $whNames[$whId] ?? "WH#{$whId}", 'value' => round($value, 2)];
        }
        usort($byWarehouse, fn($a, $b) => $b['value'] <=> $a['value']);

        return [
            'stock_value_total' => round($total, 2),
            'by_warehouse'      => $byWarehouse,
        ];
    }

    private function export(int $cid, string $from, string $to): array
    {
        $ei = ExportInvoice::where('company_id', $cid)->where('status', '!=', 'cancelled')
            ->whereBetween('invoice_date', [$from, $to])
            ->selectRaw('COUNT(*) AS c, SUM(paid_amount) AS p, SUM(balance) AS b')->first();
        $irmRecv   = Irm::where('company_id', $cid)->where('status', '!=', 'cancelled')->count();
        $irmClosed = Irm::where('company_id', $cid)->where('status', 'closed')->count();
        return [
            'ei_count'           => (int) ($ei?->c ?? 0),
            'ei_paid_inr'        => (float) ($ei?->p ?? 0),
            'ei_outstanding_inr' => (float) ($ei?->b ?? 0),
            'irm_count_received' => $irmRecv,
            'irm_count_closed'   => $irmClosed,
        ];
    }

    private function finance(int $cid): array
    {
        $ar = (float) Invoice::where('company_id', $cid)->where('status', '!=', 'cancelled')->sum('balance');
        $ap = (float) PurchaseInvoice::where('company_id', $cid)->where('status', '!=', 'cancelled')->sum('balance');

        return [
            'ar_total'     => $ar,
            'ap_total'     => $ap,
            'ar_aging'     => $this->aging('invoices', 'invoice_date', $cid),
            'ap_aging'     => $this->aging('purchase_invoices', 'invoice_date', $cid),
            'posted_today' => JournalEntry::where('company_id', $cid)->where('status', 'posted')->whereDate('entry_date', Carbon::today())->count(),
            'posted_week'  => JournalEntry::where('company_id', $cid)->where('status', 'posted')->where('entry_date', '>=', Carbon::now()->subDays(7))->count(),
        ];
    }

    /** Bucketed AR/AP aging. Returns 4 numbers — no partner names. */
    private function aging(string $table, string $dateCol, int $cid): array
    {
        $today = Carbon::today();
        $rows = DB::table($table)
            ->where('company_id', $cid)
            ->where('status', '!=', 'cancelled')
            ->whereNull('deleted_at')
            ->where('balance', '>', 0)
            ->selectRaw("DATEDIFF(?, {$dateCol}) AS age_days, SUM(balance) AS bal", [$today->toDateString()])
            ->groupBy('age_days')->get();

        $b = ['0_30' => 0.0, '31_60' => 0.0, '61_90' => 0.0, 'over_90' => 0.0];
        foreach ($rows as $r) {
            $age = (int) $r->age_days;
            $val = (float) $r->bal;
            if ($age <= 30)      $b['0_30']    += $val;
            elseif ($age <= 60)  $b['31_60']   += $val;
            elseif ($age <= 90)  $b['61_90']   += $val;
            else                 $b['over_90'] += $val;
        }
        foreach ($b as $k => $v) $b[$k] = round($v, 2);
        return $b;
    }

    /** Last 12 months of sales / purchase / production totals — privacy-safe rollups. */
    private function trends(int $cid): array
    {
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $start = Carbon::now()->startOfMonth()->subMonths($i);
            $end   = $start->copy()->endOfMonth();
            $label = $start->format('M Y'); // "Jan 2026"

            $sales    = (float) Invoice::where('company_id', $cid)->where('status', '!=', 'cancelled')
                ->whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])->sum('total');
            $purchase = (float) PurchaseInvoice::where('company_id', $cid)->where('status', '!=', 'cancelled')
                ->whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])->sum('total');
            $produced = (float) ProductionBatch::where('company_id', $cid)->where('status', '!=', 'cancelled')
                ->whereBetween('planned_start_date', [$start->toDateString(), $end->toDateString()])->sum('qty_produced');

            $months[] = [
                'label'    => $label,
                'sales'    => round($sales, 2),
                'purchase' => round($purchase, 2),
                'produced' => round($produced, 3),
            ];
        }
        return ['months' => $months];
    }

    /** Counts only — used for the "system pulse" widget. No names. */
    private function activity(int $cid): array
    {
        $today = Carbon::today();
        $weekStart = Carbon::now()->subDays(7);
        return [
            'invoices_today'    => Invoice::where('company_id', $cid)->whereDate('created_at', $today)->count(),
            'invoices_week'     => Invoice::where('company_id', $cid)->where('created_at', '>=', $weekStart)->count(),
            'pos_today'         => PurchaseOrder::where('company_id', $cid)->whereDate('created_at', $today)->count(),
            'pos_week'          => PurchaseOrder::where('company_id', $cid)->where('created_at', '>=', $weekStart)->count(),
            'batches_today'     => ProductionBatch::where('company_id', $cid)->whereDate('created_at', $today)->count(),
            'batches_week'      => ProductionBatch::where('company_id', $cid)->where('created_at', '>=', $weekStart)->count(),
            'journals_today'    => JournalEntry::where('company_id', $cid)->whereDate('created_at', $today)->count(),
            'journals_week'     => JournalEntry::where('company_id', $cid)->where('created_at', '>=', $weekStart)->count(),
        ];
    }

    private function tasks(int $cid): array
    {
        $today = Carbon::today()->toDateString();
        $open    = Task::where('company_id', $cid)->where('status', 'open')->count();
        $overdue = Task::where('company_id', $cid)->whereIn('status', ['open', 'in_progress'])
            ->whereNotNull('due_date')->where('due_date', '<', now())->count();
        $dueToday = Task::where('company_id', $cid)->whereIn('status', ['open', 'in_progress'])
            ->whereDate('due_date', $today)->count();
        return [
            'open_count'      => $open,
            'overdue_count'   => $overdue,
            'due_today_count' => $dueToday,
        ];
    }
}
