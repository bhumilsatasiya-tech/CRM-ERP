<?php

namespace Modules\Tracking\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Models\ShippingBill;
use Modules\InterCompany\Models\InterCompanyInvoice;
use Modules\Inventory\Models\StockLedger;
use Modules\Irm\Models\Irm;
use Modules\Production\Models\ProductionBatch;
use Modules\Quotation\Models\Quotation;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Models\InvoicePayment;
use Modules\Sales\Models\SalesOrder;

class OrderTrackingService
{
    /**
     * Paginated list of Sales Orders with computed progress percentages.
     * Each row carries enough to render a dashboard tile.
     */
    public function listOpenOrders(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));

        $openStatuses = (array) config('tracking.open_so_statuses', ['draft', 'submitted', 'approved', 'in_production', 'partial']);
        $statusFilter = $filters['status'] ?? null;

        $paginator = SalesOrder::query()
            ->with([
                'partner:id,code,name',
                'items',
                'invoices' => fn($q) => $q->where('status', '!=', 'cancelled')->select('id', 'sales_order_id', 'code', 'status', 'total', 'paid_amount', 'balance', 'invoice_date'),
                'productionBatches' => fn($q) => $q->where('status', '!=', 'cancelled')->select('id', 'sales_order_id', 'code', 'status', 'qty_planned', 'qty_produced', 'qty_failed', 'completed_at'),
            ])
            ->when($statusFilter, fn(Builder $q) => $q->where('status', $statusFilter), fn(Builder $q) => $q->whereIn('status', $openStatuses))
            ->when(($filters['partner_id'] ?? null), fn(Builder $q, $v) => $q->where('partner_id', (int) $v))
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('code', 'like', $like)->orWhere('reference', 'like', $like);
            }))
            ->orderByDesc('order_date')->orderByDesc('id')
            ->paginate($perPage);

        $paginator->getCollection()->transform(function (SalesOrder $so) {
            return $this->decorateProgress($so);
        });

        return $paginator;
    }

    /**
     * Build the unified timeline payload for a single Sales Order.
     */
    public function traceSalesOrder(SalesOrder $so): array
    {
        $so->load([
            'partner:id,code,name',
            'warehouse:id,code,name',
            'items.product:id,code,name',
            'invoices' => fn($q) => $q->orderBy('invoice_date'),
            'invoices.payments' => fn($q) => $q->orderBy('payment_date'),
            'productionBatches' => fn($q) => $q->orderBy('planned_start_date'),
            'productionBatches.targetProduct:id,code,name',
            'exportInvoices' => fn($q) => $q->orderBy('invoice_date'),
            'exportInvoices.shippingBills' => fn($q) => $q->orderBy('id'),
        ]);

        // Quotation (if any)
        $quotation = null;
        if ($so->quotation_id) {
            $quotation = Quotation::query()
                ->where('id', $so->quotation_id)
                ->first(['id', 'code', 'status', 'quotation_date', 'total', 'created_at']);
        }

        // IRMs and shipping bills for this SO's export invoices
        $exportInvoiceIds = $so->exportInvoices->pluck('id');
        $irms = $exportInvoiceIds->isEmpty() ? collect() : Irm::query()
            ->whereIn('export_invoice_id', $exportInvoiceIds)
            ->orderBy('irm_date')
            ->get(['id', 'code', 'export_invoice_id', 'bank_name', 'irm_date', 'irm_amount_fcy', 'irm_currency', 'irm_amount_inr', 'status']);

        $shippingBills = $so->exportInvoices->flatMap->shippingBills;

        // Stock ledger rows tied to invoices + production batches + shipping bills of this SO
        $invoiceIds      = $so->invoices->pluck('id');
        $batchIds        = $so->productionBatches->pluck('id');
        $shippingBillIds = $shippingBills->pluck('id');

        $stockMovements = StockLedger::query()
            ->with(['product:id,code,name', 'warehouse:id,code,name'])
            ->where(function ($q) use ($invoiceIds, $batchIds, $shippingBillIds) {
                $any = false;
                if ($invoiceIds->isNotEmpty())      { $any = true; $q->orWhere(fn($qq) => $qq->where('reference_type', Invoice::class)->whereIn('reference_id', $invoiceIds)); }
                if ($batchIds->isNotEmpty())        { $any = true; $q->orWhere(fn($qq) => $qq->where('reference_type', ProductionBatch::class)->whereIn('reference_id', $batchIds)); }
                if ($shippingBillIds->isNotEmpty()) { $any = true; $q->orWhere(fn($qq) => $qq->where('reference_type', ShippingBill::class)->whereIn('reference_id', $shippingBillIds)); }
                if (! $any) $q->whereRaw('1 = 0');
            })
            ->orderBy('posted_at')
            ->get(['id', 'product_id', 'warehouse_id', 'movement_type', 'qty', 'rate', 'value', 'batch_no', 'expiry_date', 'posted_at', 'reference_type', 'reference_id', 'reference_no', 'is_reversal']);

        $progress = $this->progressOf($so);

        return [
            'sales_order' => [
                'id' => $so->id,
                'code' => $so->code,
                'status' => $so->status,
                'order_date' => $so->order_date?->toDateString(),
                'expected_delivery_date' => $so->expected_delivery_date?->toDateString(),
                'partner' => $so->partner ? ['id' => $so->partner->id, 'code' => $so->partner->code, 'name' => $so->partner->name] : null,
                'warehouse' => $so->warehouse ? ['id' => $so->warehouse->id, 'code' => $so->warehouse->code, 'name' => $so->warehouse->name] : null,
                'currency' => $so->currency,
                'total' => (float) $so->total,
                'invoiced_amount' => (float) $so->invoiced_amount,
                'lines' => $so->items->map(fn($l) => [
                    'id' => $l->id,
                    'product' => $l->product ? ['id' => $l->product->id, 'code' => $l->product->code, 'name' => $l->product->name] : null,
                    'qty' => (float) $l->qty,
                    'invoiced_qty' => (float) $l->invoiced_qty,
                    'rate' => (float) $l->rate,
                    'line_total' => (float) $l->line_total,
                ])->values(),
            ],
            'quotation' => $quotation ? [
                'id' => $quotation->id, 'code' => $quotation->code, 'status' => $quotation->status,
                'quotation_date' => $quotation->quotation_date?->toDateString(),
                'total' => (float) $quotation->total,
            ] : null,
            'production' => [
                'batches' => $so->productionBatches->map(fn(ProductionBatch $b) => [
                    'id' => $b->id, 'code' => $b->code, 'status' => $b->status,
                    'target_product' => $b->targetProduct ? ['id' => $b->targetProduct->id, 'code' => $b->targetProduct->code, 'name' => $b->targetProduct->name] : null,
                    'qty_planned' => (float) $b->qty_planned,
                    'qty_produced' => (float) $b->qty_produced,
                    'qty_failed' => (float) $b->qty_failed,
                    'planned_start_date' => $b->planned_start_date?->toDateString(),
                    'completed_at' => $b->completed_at?->toIso8601String(),
                    'cancelled_at' => $b->cancelled_at?->toIso8601String(),
                ])->values(),
                'total_planned'  => (float) $so->productionBatches->where('status', '!=', 'cancelled')->sum('qty_planned'),
                'total_produced' => (float) $so->productionBatches->where('status', '!=', 'cancelled')->sum('qty_produced'),
                'total_failed'   => (float) $so->productionBatches->where('status', '!=', 'cancelled')->sum('qty_failed'),
            ],
            'invoices' => $so->invoices->map(fn(Invoice $inv) => [
                'id' => $inv->id, 'code' => $inv->code, 'status' => $inv->status,
                'invoice_date' => $inv->invoice_date?->toDateString(),
                'total' => (float) $inv->total,
                'paid_amount' => (float) $inv->paid_amount,
                'balance' => (float) $inv->balance,
                'posted_at' => $inv->posted_at?->toIso8601String(),
                'payments_count' => $inv->payments->count(),
            ])->values(),
            'payments_total' => (float) $so->invoices->flatMap->payments->sum('amount'),
            'export_invoices' => $so->exportInvoices->map(fn(ExportInvoice $ei) => [
                'id' => $ei->id, 'code' => $ei->code, 'status' => $ei->status,
                'invoice_date' => $ei->invoice_date?->toDateString(),
                'currency' => $ei->currency,
                'total' => (float) $ei->total,
                'paid_amount' => (float) $ei->paid_amount,
                'balance' => (float) $ei->balance,
                'incoterm' => $ei->incoterm,
                'shipping_bills_count' => $ei->shippingBills->count(),
            ])->values(),
            'shipping_bills' => $shippingBills->map(fn(ShippingBill $sb) => [
                'id' => $sb->id, 'code' => $sb->code, 'status' => $sb->status,
                'bl_no' => $sb->bl_no, 'bl_date' => $sb->bl_date?->toDateString(),
                'export_invoice_id' => $sb->export_invoice_id,
                'dispatched_at' => $sb->dispatched_at?->toIso8601String(),
            ])->values(),
            'irms' => $irms->map(fn(Irm $irm) => [
                'id' => $irm->id, 'code' => $irm->code,
                'export_invoice_id' => $irm->export_invoice_id,
                'bank_name' => $irm->bank_name,
                'irm_date' => $irm->irm_date?->toDateString(),
                'irm_amount_fcy' => (float) $irm->irm_amount_fcy,
                'irm_currency' => $irm->irm_currency,
                'irm_amount_inr' => (float) $irm->irm_amount_inr,
                'status' => $irm->status,
            ])->values(),
            'stock_movements' => $stockMovements->map(fn(StockLedger $m) => [
                'ledger_id' => $m->id,
                'product' => $m->product ? ['id' => $m->product->id, 'code' => $m->product->code, 'name' => $m->product->name] : null,
                'warehouse' => $m->warehouse ? ['id' => $m->warehouse->id, 'code' => $m->warehouse->code, 'name' => $m->warehouse->name] : null,
                'movement_type' => $m->movement_type,
                'qty' => (float) $m->qty,
                'rate' => (float) $m->rate,
                'value' => (float) $m->value,
                'batch_no' => $m->batch_no,
                'expiry_date' => $m->expiry_date?->toDateString(),
                'posted_at' => $m->posted_at?->toIso8601String(),
                'reference_no' => $m->reference_no,
                'reference_type' => $this->shortRef($m->reference_type),
                'reference_id' => $m->reference_id,
                'is_reversal' => (bool) $m->is_reversal,
            ])->values(),
            'progress' => $progress,
            'timeline' => $this->buildTimeline($so, $quotation, $stockMovements, $shippingBills, $irms),
        ];
    }

    /**
     * Compute progress percentages for a Sales Order.
     * - ordered_qty: sum of line qty
     * - produced_qty: sum of qty_produced across non-cancelled batches
     * - invoiced_amount, paid_amount: from SO's invoices
     */
    public function progressOf(SalesOrder $so): array
    {
        $orderedQty = (float) ($so->items?->sum('qty') ?? 0);
        $producedQty = (float) ($so->productionBatches?->where('status', '!=', 'cancelled')->sum('qty_produced') ?? 0);
        $invoicedAmount = (float) ($so->invoices?->where('status', '!=', 'cancelled')->sum('total') ?? 0);
        $paidAmount = (float) ($so->invoices?->where('status', '!=', 'cancelled')->sum('paid_amount') ?? 0);
        $total = (float) $so->total;

        return [
            'ordered_qty'   => $orderedQty,
            'produced_qty'  => $producedQty,
            'invoiced_amount' => $invoicedAmount,
            'paid_amount'   => $paidAmount,
            'total'         => $total,
            'produced_pct'  => $orderedQty > 0 ? round(min(100, $producedQty * 100 / $orderedQty), 1) : 0.0,
            'invoiced_pct'  => $total > 0 ? round(min(100, $invoicedAmount * 100 / $total), 1) : 0.0,
            'paid_pct'      => $total > 0 ? round(min(100, $paidAmount * 100 / $total), 1) : 0.0,
        ];
    }

    private function decorateProgress(SalesOrder $so): SalesOrder
    {
        $p = $this->progressOf($so);
        $so->setAttribute('_progress', $p);
        return $so;
    }

    /**
     * Build a chronological list of timeline events.
     */
    private function buildTimeline(SalesOrder $so, ?Quotation $q, $stockMovements, $shippingBills = null, $irms = null): array
    {
        $events = [];

        if ($q) {
            $events[] = [
                'kind' => 'quotation_created',
                'at' => $q->created_at?->toIso8601String(),
                'ref_type' => 'quotation', 'ref_id' => $q->id, 'ref_code' => $q->code,
                'label' => "Quotation {$q->code} created",
            ];
            if (in_array($q->status, ['approved', 'converted'], true)) {
                $events[] = [
                    'kind' => 'quotation_approved',
                    'at' => $q->updated_at?->toIso8601String(),
                    'ref_type' => 'quotation', 'ref_id' => $q->id, 'ref_code' => $q->code,
                    'label' => "Quotation {$q->code} approved",
                ];
            }
        }

        $events[] = [
            'kind' => 'so_created',
            'at' => $so->created_at?->toIso8601String(),
            'ref_type' => 'sales_order', 'ref_id' => $so->id, 'ref_code' => $so->code,
            'label' => "Sales order {$so->code} created",
            'amount' => (float) $so->total,
        ];
        if ($so->approved_at) {
            $events[] = [
                'kind' => 'so_approved',
                'at' => $so->approved_at->toIso8601String(),
                'ref_type' => 'sales_order', 'ref_id' => $so->id, 'ref_code' => $so->code,
                'label' => "Sales order {$so->code} approved",
            ];
        }

        foreach ($so->productionBatches as $b) {
            if ($b->started_at) {
                $events[] = [
                    'kind' => 'batch_started',
                    'at' => $b->started_at->toIso8601String(),
                    'ref_type' => 'production_batch', 'ref_id' => $b->id, 'ref_code' => $b->code,
                    'label' => "Production batch {$b->code} started",
                ];
            }
            if ($b->completed_at) {
                $events[] = [
                    'kind' => 'batch_completed',
                    'at' => $b->completed_at->toIso8601String(),
                    'ref_type' => 'production_batch', 'ref_id' => $b->id, 'ref_code' => $b->code,
                    'label' => "Production batch {$b->code} completed (produced " . number_format((float) $b->qty_produced, 3) . ")",
                ];
            }
            if ($b->cancelled_at) {
                $events[] = [
                    'kind' => 'batch_cancelled',
                    'at' => $b->cancelled_at->toIso8601String(),
                    'ref_type' => 'production_batch', 'ref_id' => $b->id, 'ref_code' => $b->code,
                    'label' => "Production batch {$b->code} cancelled",
                ];
            }
        }

        foreach ($so->invoices as $inv) {
            $events[] = [
                'kind' => 'invoice_created',
                'at' => $inv->created_at?->toIso8601String(),
                'ref_type' => 'invoice', 'ref_id' => $inv->id, 'ref_code' => $inv->code,
                'label' => "Invoice {$inv->code} created",
                'amount' => (float) $inv->total,
            ];
            if ($inv->posted_at) {
                $events[] = [
                    'kind' => 'invoice_posted',
                    'at' => $inv->posted_at->toIso8601String(),
                    'ref_type' => 'invoice', 'ref_id' => $inv->id, 'ref_code' => $inv->code,
                    'label' => "Invoice {$inv->code} posted (stock OUT recorded)",
                    'amount' => (float) $inv->total,
                ];
            }
            foreach ($inv->payments as $p) {
                $events[] = [
                    'kind' => 'payment_received',
                    'at' => $p->payment_date?->toIso8601String() ?? $p->created_at?->toIso8601String(),
                    'ref_type' => 'invoice_payment', 'ref_id' => $p->id, 'ref_code' => "PAY/{$p->id}",
                    'label' => "Payment received against {$inv->code} ({$p->mode})",
                    'amount' => (float) $p->amount,
                ];
            }
        }

        // Export invoices
        foreach ($so->exportInvoices as $ei) {
            $events[] = [
                'kind' => 'export_invoice_created',
                'at' => $ei->created_at?->toIso8601String(),
                'ref_type' => 'export_invoice', 'ref_id' => $ei->id, 'ref_code' => $ei->code,
                'label' => "Export invoice {$ei->code} created ({$ei->currency})",
                'amount' => (float) $ei->total,
            ];
            if ($ei->posted_at) {
                $events[] = [
                    'kind' => 'export_invoice_posted',
                    'at' => $ei->posted_at->toIso8601String(),
                    'ref_type' => 'export_invoice', 'ref_id' => $ei->id, 'ref_code' => $ei->code,
                    'label' => "Export invoice {$ei->code} posted",
                    'amount' => (float) $ei->total,
                ];
            }
        }

        // Shipping bills
        if ($shippingBills) {
            foreach ($shippingBills as $sb) {
                if ($sb->dispatched_at) {
                    $events[] = [
                        'kind' => 'shipping_bill_dispatched',
                        'at' => $sb->dispatched_at->toIso8601String(),
                        'ref_type' => 'shipping_bill', 'ref_id' => $sb->id, 'ref_code' => $sb->code,
                        'label' => "Shipping bill {$sb->code} dispatched" . ($sb->bl_no ? " (BL {$sb->bl_no})" : ''),
                    ];
                }
                if ($sb->cancelled_at) {
                    $events[] = [
                        'kind' => 'shipping_bill_cancelled',
                        'at' => $sb->cancelled_at->toIso8601String(),
                        'ref_type' => 'shipping_bill', 'ref_id' => $sb->id, 'ref_code' => $sb->code,
                        'label' => "Shipping bill {$sb->code} cancelled",
                    ];
                }
            }
        }

        // IRMs
        if ($irms) {
            foreach ($irms as $irm) {
                $events[] = [
                    'kind' => 'irm_received',
                    'at' => $irm->irm_date?->toIso8601String() ?? $irm->created_at?->toIso8601String(),
                    'ref_type' => 'irm', 'ref_id' => $irm->id, 'ref_code' => $irm->code,
                    'label' => "IRM {$irm->code} received from {$irm->bank_name} ({$irm->irm_amount_fcy} {$irm->irm_currency} = INR " . number_format((float) $irm->irm_amount_inr, 2) . ")",
                    'amount' => (float) $irm->irm_amount_inr,
                ];
                if ($irm->status === 'closed') {
                    $events[] = [
                        'kind' => 'irm_closed',
                        'at' => $irm->updated_at?->toIso8601String(),
                        'ref_type' => 'irm', 'ref_id' => $irm->id, 'ref_code' => $irm->code,
                        'label' => "IRM {$irm->code} closed (bank realization recorded)",
                    ];
                }
            }
        }

        // Sort by `at` ascending (null treated as epoch)
        usort($events, fn($a, $b) => strcmp($a['at'] ?? '', $b['at'] ?? ''));

        return $events;
    }

    private function shortRef(?string $fqcn): ?string
    {
        if (! $fqcn) return null;
        return match ($fqcn) {
            Invoice::class                  => 'invoice',
            ProductionBatch::class          => 'production_batch',
            ExportInvoice::class            => 'export_invoice',
            ShippingBill::class             => 'shipping_bill',
            InterCompanyInvoice::class      => 'inter_company_invoice',
            \Modules\Purchase\Models\Grn::class => 'grn',
            \Modules\Inventory\Models\StockAdjustment::class => 'stock_adjustment',
            \Modules\Inventory\Models\StockTransfer::class   => 'stock_transfer',
            default => $fqcn,
        };
    }
}
