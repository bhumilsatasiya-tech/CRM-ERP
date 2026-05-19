<?php

namespace Modules\Reports\Services;

use Illuminate\Support\Facades\DB;
use Modules\Export\Models\ExportInvoice;
use Modules\Finance\Services\BalanceService;
use Modules\Inventory\Services\StockService;
use Modules\Irm\Models\Irm;
use Modules\Production\Models\ProductionBatch;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Sales\Models\Invoice;

class ReportService
{
    public function __construct(
        private StockService $stock,
        private BalanceService $balances,
    ) {}

    public function salesRegister(int $companyId, string $from, string $to, ?int $partnerId = null): array
    {
        $rows = Invoice::query()
            ->with(['partner:id,code,name'])
            ->where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('invoice_date', [$from, $to])
            ->when($partnerId, fn($q, $v) => $q->where('partner_id', (int) $v))
            ->orderBy('invoice_date')->orderBy('id')
            ->get(['id', 'code', 'partner_id', 'invoice_date', 'subtotal', 'tax_amount', 'total', 'paid_amount', 'balance', 'status']);
        return [
            'rows' => $rows->map(fn($i) => [
                'id' => $i->id, 'code' => $i->code,
                'date' => $i->invoice_date?->toDateString(),
                'partner' => $i->partner ? "{$i->partner->code} — {$i->partner->name}" : '—',
                'subtotal' => (float) $i->subtotal, 'tax_amount' => (float) $i->tax_amount,
                'total' => (float) $i->total, 'paid' => (float) $i->paid_amount, 'balance' => (float) $i->balance,
                'status' => $i->status,
            ])->values(),
            'totals' => [
                'subtotal' => (float) $rows->sum('subtotal'),
                'tax'      => (float) $rows->sum('tax_amount'),
                'total'    => (float) $rows->sum('total'),
                'paid'     => (float) $rows->sum('paid_amount'),
                'balance'  => (float) $rows->sum('balance'),
            ],
        ];
    }

    public function purchaseRegister(int $companyId, string $from, string $to, ?int $partnerId = null): array
    {
        $rows = PurchaseInvoice::query()
            ->with(['partner:id,code,name'])
            ->where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('invoice_date', [$from, $to])
            ->when($partnerId, fn($q, $v) => $q->where('partner_id', (int) $v))
            ->orderBy('invoice_date')->orderBy('id')
            ->get(['id', 'code', 'partner_id', 'invoice_date', 'subtotal', 'tax_amount', 'total', 'paid_amount', 'balance', 'status']);
        return [
            'rows' => $rows->map(fn($i) => [
                'id' => $i->id, 'code' => $i->code,
                'date' => $i->invoice_date?->toDateString(),
                'partner' => $i->partner ? "{$i->partner->code} — {$i->partner->name}" : '—',
                'subtotal' => (float) $i->subtotal, 'tax_amount' => (float) $i->tax_amount,
                'total' => (float) $i->total, 'paid' => (float) $i->paid_amount, 'balance' => (float) $i->balance,
                'status' => $i->status,
            ])->values(),
            'totals' => [
                'subtotal' => (float) $rows->sum('subtotal'),
                'tax'      => (float) $rows->sum('tax_amount'),
                'total'    => (float) $rows->sum('total'),
                'paid'     => (float) $rows->sum('paid_amount'),
                'balance'  => (float) $rows->sum('balance'),
            ],
        ];
    }

    public function stockSummary(int $companyId, ?int $warehouseId = null): array
    {
        return ['rows' => $this->stock->currentStockPivot($companyId, $warehouseId)];
    }

    public function productionSummary(int $companyId, string $from, string $to): array
    {
        $rows = ProductionBatch::query()
            ->with(['targetProduct:id,code,name'])
            ->where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('planned_start_date', [$from, $to])
            ->orderBy('planned_start_date')->get();
        return [
            'rows' => $rows->map(fn($b) => [
                'id' => $b->id, 'code' => $b->code, 'date' => $b->planned_start_date?->toDateString(),
                'product' => $b->targetProduct ? "{$b->targetProduct->code} — {$b->targetProduct->name}" : '—',
                'qty_planned' => (float) $b->qty_planned,
                'qty_produced' => (float) $b->qty_produced,
                'qty_failed' => (float) $b->qty_failed,
                'material_cost' => (float) $b->material_cost,
                'status' => $b->status,
            ])->values(),
            'totals' => [
                'planned'  => (float) $rows->sum('qty_planned'),
                'produced' => (float) $rows->sum('qty_produced'),
                'failed'   => (float) $rows->sum('qty_failed'),
                'cost'     => (float) $rows->sum('material_cost'),
            ],
        ];
    }

    public function paymentsReceivable(int $companyId, string $asOf): array
    {
        $rows = Invoice::query()
            ->with(['partner:id,code,name'])
            ->where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->where('invoice_date', '<=', $asOf)
            ->where('balance', '>', 0)
            ->orderBy('invoice_date')->get(['id', 'code', 'partner_id', 'invoice_date', 'total', 'paid_amount', 'balance']);
        return [
            'as_of' => $asOf,
            'rows' => $rows->map(fn($i) => [
                'id' => $i->id, 'code' => $i->code, 'date' => $i->invoice_date?->toDateString(),
                'partner' => $i->partner ? "{$i->partner->code} — {$i->partner->name}" : '—',
                'total' => (float) $i->total, 'paid' => (float) $i->paid_amount, 'balance' => (float) $i->balance,
                'days_overdue' => max(0, now()->diffInDays($i->invoice_date)),
            ])->values(),
            'totals' => ['total' => (float) $rows->sum('total'), 'paid' => (float) $rows->sum('paid_amount'), 'balance' => (float) $rows->sum('balance')],
        ];
    }

    public function paymentsPayable(int $companyId, string $asOf): array
    {
        $rows = PurchaseInvoice::query()
            ->with(['partner:id,code,name'])
            ->where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->where('invoice_date', '<=', $asOf)
            ->where('balance', '>', 0)
            ->orderBy('invoice_date')->get(['id', 'code', 'partner_id', 'invoice_date', 'total', 'paid_amount', 'balance']);
        return [
            'as_of' => $asOf,
            'rows' => $rows->map(fn($i) => [
                'id' => $i->id, 'code' => $i->code, 'date' => $i->invoice_date?->toDateString(),
                'partner' => $i->partner ? "{$i->partner->code} — {$i->partner->name}" : '—',
                'total' => (float) $i->total, 'paid' => (float) $i->paid_amount, 'balance' => (float) $i->balance,
                'days_overdue' => max(0, now()->diffInDays($i->invoice_date)),
            ])->values(),
            'totals' => ['total' => (float) $rows->sum('total'), 'paid' => (float) $rows->sum('paid_amount'), 'balance' => (float) $rows->sum('balance')],
        ];
    }

    public function profitAndLoss(int $companyId, string $from, string $to): array
    {
        return $this->balances->profitAndLoss($companyId, $from, $to);
    }

    public function balanceSheet(int $companyId, string $asOf): array
    {
        return $this->balances->balanceSheet($companyId, $asOf);
    }

    public function exportRealization(int $companyId, string $from, string $to): array
    {
        $eis = ExportInvoice::query()
            ->with(['partner:id,code,name'])
            ->where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('invoice_date', [$from, $to])
            ->orderBy('invoice_date')->get(['id', 'code', 'partner_id', 'invoice_date', 'currency', 'total', 'paid_amount', 'balance', 'status']);

        $eiIds = $eis->pluck('id');
        $irms = $eiIds->isEmpty() ? collect() : Irm::query()
            ->whereIn('export_invoice_id', $eiIds)
            ->where('status', '!=', 'cancelled')
            ->get(['id', 'code', 'export_invoice_id', 'irm_date', 'irm_amount_fcy', 'irm_currency', 'irm_amount_inr', 'status']);

        return [
            'rows' => $eis->map(function ($ei) use ($irms) {
                $eiIrms = $irms->where('export_invoice_id', $ei->id);
                return [
                    'id' => $ei->id, 'code' => $ei->code,
                    'date' => $ei->invoice_date?->toDateString(),
                    'partner' => $ei->partner ? "{$ei->partner->code} — {$ei->partner->name}" : '—',
                    'currency' => $ei->currency,
                    'total' => (float) $ei->total,
                    'paid_inr' => (float) $ei->paid_amount,
                    'balance_inr' => (float) $ei->balance,
                    'irms_count' => $eiIrms->count(),
                    'irms_total_inr' => (float) $eiIrms->sum('irm_amount_inr'),
                    'status' => $ei->status,
                ];
            })->values(),
            'totals' => [
                'total'   => (float) $eis->sum('total'),
                'paid'    => (float) $eis->sum('paid_amount'),
                'balance' => (float) $eis->sum('balance'),
                'irms'    => (float) $irms->sum('irm_amount_inr'),
            ],
        ];
    }
}
