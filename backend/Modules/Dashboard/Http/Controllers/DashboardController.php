<?php

namespace Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Dashboard\Services\DashboardService;
use Modules\Irm\Models\Irm;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Sales\Models\Invoice;
use Modules\Tasks\Models\Task;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $service) {}

    public function kpis(Request $request): JsonResponse
    {
        if (! $request->user()?->can('dashboard.view')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $from = (string) $request->input('from', now()->subDays(30)->toDateString());
        $to   = (string) $request->input('to',   now()->toDateString());

        // Cache 60s per (company, from, to) — Dashboard fans out 8-12 sub-queries
        // and is the heaviest single endpoint. Multiple users + dashboard refreshes
        // hit the same cached payload. Invalidated implicitly by TTL (no auto-bust);
        // 60s is short enough that posted documents appear within a minute.
        $key = "dashboard:kpis:{$companyId}:{$from}:{$to}";
        $payload = Cache::remember($key, 60, fn () => $this->service->kpis($companyId, $from, $to));

        return response()->json(['data' => $payload]);
    }

    /**
     * Day Drawer — actionable counters for "what should I do right now?".
     *
     * Returns counts ONLY (no names, no row data). Each counter links to a
     * filtered list URL the frontend already knows how to render.
     *
     * Cached 30s — short window because users post things and immediately want
     * the counters to refresh, but long enough to absorb the rapid mounts that
     * happen when toggling the drawer open/closed.
     */
    public function dayActions(Request $request): JsonResponse
    {
        if (! $request->user()?->can('dashboard.view')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $userId = $request->user()?->id;
        $today = now()->toDateString();

        $key = "dashboard:day-actions:{$companyId}:u{$userId}";
        $payload = Cache::remember($key, 30, function () use ($companyId, $userId, $today) {
            return [
                'date' => $today,
                'invoices_draft'   => Invoice::where('company_id', $companyId)->where('status', 'draft')->count(),
                'invoices_overdue' => Invoice::where('company_id', $companyId)->where('status', '!=', 'cancelled')
                    ->where('balance', '>', 0)->whereDate('due_date', '<', $today)->count(),
                'pis_draft'        => PurchaseInvoice::where('company_id', $companyId)->where('status', 'draft')->count(),
                'pis_unpaid'       => PurchaseInvoice::where('company_id', $companyId)->where('status', '!=', 'cancelled')
                    ->where('balance', '>', 0)->count(),
                'irms_outstanding' => Irm::where('company_id', $companyId)
                    ->whereIn('status', ['received', 'partially_allocated'])
                    ->where('outstanding_amount_fcy', '>', 0)->count(),
                'emis_due_today'   => DB::table('loan_emi_schedule')
                    ->join('loans', 'loans.id', '=', 'loan_emi_schedule.loan_id')
                    ->where('loans.company_id', $companyId)
                    ->whereIn('loan_emi_schedule.status', ['pending', 'partial', 'overdue'])
                    ->whereDate('loan_emi_schedule.due_date', '<=', $today)
                    ->count(),
                'tasks_overdue'    => Task::where('company_id', $companyId)
                    ->whereIn('status', ['open', 'in_progress'])
                    ->whereNotNull('due_date')->where('due_date', '<', now())
                    ->when($userId, fn ($q) => $q->where('assignee_id', $userId))
                    ->count(),
                'tasks_due_today'  => Task::where('company_id', $companyId)
                    ->whereIn('status', ['open', 'in_progress'])
                    ->whereDate('due_date', $today)
                    ->when($userId, fn ($q) => $q->where('assignee_id', $userId))
                    ->count(),
            ];
        });

        return response()->json(['data' => $payload]);
    }
}
