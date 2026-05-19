<?php

namespace Modules\Sales\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Inventory\Models\StockLedger;
use Modules\Inventory\Services\StockService;
use Modules\Sales\Events\InvoicePaymentReceived;
use Modules\Sales\Events\InvoicePosted;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Models\InvoiceItem;
use Modules\Sales\Models\InvoicePayment;
use Modules\Sales\Models\SalesOrderItem;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class InvoiceService
{
    public function __construct(
        private StockService $stock,
        private SequenceService $sequences,
        private SalesOrderService $salesOrders,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Invoice::query()
            ->with(['partner:id,code,name', 'warehouse:id,code,name'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->orderByDesc('invoice_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): Invoice
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'invoice', $header['code'] ?? null);
            $inv = Invoice::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => Invoice::STATUS_DRAFT,
                'currency' => $header['currency'] ?? 'INR',
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncLines($inv, $lines);
            $this->recalc($inv);
            return $inv->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function update(Invoice $inv, array $header, ?array $lines, ?int $actorId = null): Invoice
    {
        if (! $inv->isEditable()) throw new RuntimeException('Only draft invoices can be edited.');
        return DB::transaction(function () use ($inv, $header, $lines, $actorId) {
            $inv->fill($header); $inv->updated_by = $actorId; $inv->save();
            if (is_array($lines)) $this->syncLines($inv, $lines);
            $this->recalc($inv);
            return $inv->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function delete(Invoice $inv): void
    {
        if (! $inv->isEditable()) throw new RuntimeException('Only draft invoices can be deleted.');
        DB::transaction(fn() => $inv->delete());
    }

    /** Posting writes one stock_ledger OUT row per line + bumps SO invoiced_qty. */
    public function post(Invoice $inv, ?int $actorId = null): Invoice
    {
        if ($inv->status !== Invoice::STATUS_DRAFT) throw new RuntimeException('Only draft invoices can be posted.');
        if (! $inv->items()->exists()) throw new RuntimeException('Cannot post an invoice with no lines.');

        return DB::transaction(function () use ($inv, $actorId) {
            foreach ($inv->items as $line) {
                $ledger = $this->stock->record([
                    'company_id'     => $inv->company_id,
                    'warehouse_id'   => $inv->warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::OUT,
                    'qty'            => (float) $line->qty,
                    'rate'           => (float) $line->rate,
                    'reference_type' => Invoice::class,
                    'reference_id'   => $inv->id,
                    'reference_no'   => $inv->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'posted_at'      => $inv->invoice_date,
                    'notes'          => "Invoice {$inv->code}",
                    'created_by'     => $actorId,
                ]);
                $line->forceFill(['ledger_id' => $ledger->id])->save();

                if ($line->sales_order_item_id) {
                    SalesOrderItem::where('id', $line->sales_order_item_id)
                        ->increment('invoiced_qty', (float) $line->qty);
                }
            }

            $inv->forceFill([
                'status' => Invoice::STATUS_POSTED,
                'posted_at' => now(),
                'balance' => (float) $inv->total - (float) $inv->paid_amount,
            ])->save();

            // Refresh SO progress
            if ($inv->sales_order_id && $inv->order) {
                $this->salesOrders->recalcInvoiceProgress($inv->order);
            }
            $fresh = $inv->fresh(['items', 'partner', 'warehouse']);
            event(new InvoicePosted($fresh));
            return $fresh;
        });
    }

    public function cancel(Invoice $inv, ?string $reason = null, ?int $actorId = null): Invoice
    {
        if ($inv->status === Invoice::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        return DB::transaction(function () use ($inv, $reason, $actorId) {
            // Reverse stock OUT rows
            if (in_array($inv->status, [Invoice::STATUS_POSTED, Invoice::STATUS_PARTIALLY_PAID, Invoice::STATUS_PAID], true)) {
                foreach ($inv->items as $line) {
                    if ($line->ledger_id) {
                        $this->stock->reverse($line->ledger_id, "Cancelled invoice {$inv->code}", $actorId);
                    }
                    if ($line->sales_order_item_id) {
                        SalesOrderItem::where('id', $line->sales_order_item_id)
                            ->decrement('invoiced_qty', (float) $line->qty);
                    }
                }
                if ($inv->sales_order_id && $inv->order) {
                    $this->salesOrders->recalcInvoiceProgress($inv->order);
                }
            }
            $inv->forceFill([
                'status' => Invoice::STATUS_CANCELLED,
                'cancelled_by' => $actorId, 'cancelled_at' => now(), 'cancellation_reason' => $reason,
            ])->save();
            return $inv;
        });
    }

    /** Record a payment against an invoice; auto-flips status to partially_paid / paid. */
    public function recordPayment(Invoice $inv, array $data, ?int $actorId = null): InvoicePayment
    {
        if ($inv->status === Invoice::STATUS_DRAFT) {
            throw new RuntimeException('Cannot record payment against a draft invoice. Post it first.');
        }
        if ($inv->status === Invoice::STATUS_CANCELLED) {
            throw new RuntimeException('Cannot record payment against a cancelled invoice.');
        }
        $amount = (float) $data['amount'];
        if ($amount <= 0) throw new RuntimeException('Payment amount must be positive.');
        if ($amount > (float) $inv->balance + 0.01) {
            throw new RuntimeException('Payment exceeds invoice balance.');
        }
        return DB::transaction(function () use ($inv, $data, $amount, $actorId) {
            $payment = InvoicePayment::create([
                'company_id'    => $inv->company_id,
                'invoice_id'    => $inv->id,
                'partner_id'    => $inv->partner_id,
                'payment_date'  => $data['payment_date'] ?? now()->toDateString(),
                'amount'        => $amount,
                'mode'          => $data['mode'] ?? 'bank',
                'reference'     => $data['reference'] ?? null,
                'currency'      => $data['currency'] ?? $inv->currency,
                'exchange_rate' => $data['exchange_rate'] ?? 1,
                'notes'         => $data['notes'] ?? null,
                'created_by'    => $actorId,
            ]);

            $newPaid    = round((float) $inv->paid_amount + $amount, 2);
            $newBalance = round((float) $inv->total - $newPaid, 2);
            $newStatus  = $newBalance <= 0.0001 ? Invoice::STATUS_PAID : Invoice::STATUS_PARTIALLY_PAID;
            $inv->forceFill([
                'paid_amount' => $newPaid,
                'balance'     => $newBalance,
                'status'      => $newStatus,
            ])->save();
            event(new InvoicePaymentReceived($payment->fresh(['invoice'])));
            return $payment;
        });
    }

    public function deletePayment(InvoicePayment $p): void
    {
        DB::transaction(function () use ($p) {
            $inv = $p->invoice;
            $newPaid    = round((float) $inv->paid_amount - (float) $p->amount, 2);
            $newBalance = round((float) $inv->total - $newPaid, 2);
            $newStatus  = $newPaid <= 0.0001 ? Invoice::STATUS_POSTED : ($newBalance <= 0.0001 ? Invoice::STATUS_PAID : Invoice::STATUS_PARTIALLY_PAID);
            $p->delete();
            $inv->forceFill([
                'paid_amount' => max(0.0, $newPaid),
                'balance'     => $newBalance,
                'status'      => $newStatus,
            ])->save();
        });
    }

    /**
     * Apply a lump-sum receipt across many open Invoices for one partner.
     * Allocates oldest-due-first until the total is exhausted. Throws if total
     * exceeds the sum of open balances. Returns the list of created InvoicePayment rows.
     */
    public function recordBuyerBulkReceipt(int $companyId, array $data, ?int $actorId = null): array
    {
        $partnerId = (int) $data['partner_id'];
        $total = (float) $data['amount'];
        if ($total <= 0) throw new RuntimeException('Bulk receipt amount must be positive.');

        $open = Invoice::query()
            ->where('company_id', $companyId)
            ->where('partner_id', $partnerId)
            ->whereIn('status', [Invoice::STATUS_POSTED, Invoice::STATUS_PARTIALLY_PAID])
            ->orderBy('invoice_date')->orderBy('id')
            ->get();

        $totalOutstanding = (float) $open->sum('balance');
        if ($total > $totalOutstanding + 0.01) {
            throw new RuntimeException("Amount {$total} exceeds total open balance {$totalOutstanding} for this buyer.");
        }

        $created = [];
        $remaining = $total;
        foreach ($open as $inv) {
            if ($remaining <= 0.001) break;
            $apply = min($remaining, (float) $inv->balance);
            if ($apply <= 0.001) continue;
            $created[] = $this->recordPayment($inv, array_merge($data, ['amount' => $apply]), $actorId);
            $remaining = round($remaining - $apply, 2);
        }
        return $created;
    }

    private function syncLines(Invoice $inv, array $lines): void
    {
        $inv->items()->delete();
        foreach ($lines as $row) {
            $qty = (float) $row['qty']; $rate = (float) ($row['rate'] ?? 0);
            $disc = (float) ($row['discount_pct'] ?? 0); $tax = (float) ($row['tax_rate'] ?? 0);
            $sub = round($qty * $rate * (1 - $disc / 100), 2);
            $taxAmount = round($sub * $tax / 100, 2);
            InvoiceItem::create([
                'invoice_id'           => $inv->id,
                'sales_order_item_id'  => $row['sales_order_item_id'] ?? null,
                'product_id'           => $row['product_id'],
                'hsn_code'             => $row['hsn_code'] ?? null,
                'qty'                  => $qty, 'rate' => $rate,
                'discount_pct'         => $disc, 'tax_rate' => $tax,
                'line_subtotal'        => $sub, 'tax_amount' => $taxAmount, 'line_total' => $sub + $taxAmount,
                'batch_no'             => $row['batch_no'] ?? null,
                'expiry_date'          => $row['expiry_date'] ?? null,
                'notes'                => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalc(Invoice $inv): void
    {
        $items = $inv->items()->get();
        $sub = $items->sum('line_subtotal');
        $tax = $items->sum('tax_amount');
        $total = $sub + $tax + (float) $inv->shipping - (float) $inv->discount;
        $inv->forceFill([
            'subtotal' => round($sub, 2),
            'tax_amount' => round($tax, 2),
            'total' => round($total, 2),
            'balance' => round($total - (float) $inv->paid_amount, 2),
        ])->save();
    }
}
