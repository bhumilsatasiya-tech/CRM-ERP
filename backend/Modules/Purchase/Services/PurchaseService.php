<?php

namespace Modules\Purchase\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Inventory\Models\StockLedger;
use Modules\Inventory\Services\StockService;
use Modules\Purchase\Events\PurchaseInvoicePaymentMade;
use Modules\Purchase\Events\PurchaseInvoicePosted;
use Modules\Purchase\Models\Grn;
use Modules\Purchase\Models\GrnItem;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Purchase\Models\PurchaseInvoiceItem;
use Modules\Purchase\Models\PurchaseInvoicePayment;
use Modules\Purchase\Models\PurchaseOrder;
use Modules\Purchase\Models\PurchaseOrderItem;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class PurchaseService
{
    public function __construct(private StockService $stock, private SequenceService $sequences) {}

    /* ---------------- PURCHASE ORDER ---------------- */

    public function paginatePO(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return PurchaseOrder::query()
            ->with(['partner:id,code,name', 'warehouse:id,code,name'])
            ->withCount('items')
            ->when(($filters['search']  ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('code', 'like', $like)->orWhere('reference', 'like', $like);
            }))
            ->when(($filters['status']     ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['partner_id'] ?? null), fn(Builder $q) => $q->where('partner_id', (int) $filters['partner_id']))
            ->orderByDesc('order_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function createPO(int $companyId, array $header, array $lines, ?int $actorId = null): PurchaseOrder
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'purchase_order', $header['code'] ?? null);
            $po = PurchaseOrder::create(array_merge($header, [
                'company_id' => $companyId,
                'code'       => $code,
                'status'     => PurchaseOrder::STATUS_DRAFT,
                'currency'   => $header['currency'] ?? 'INR',
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));
            $this->syncPOLines($po, $lines);
            $this->recalcPO($po);
            return $po->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function updatePO(PurchaseOrder $po, array $header, ?array $lines, ?int $actorId = null): PurchaseOrder
    {
        if (! $po->isEditable()) throw new RuntimeException('Only draft/submitted POs can be edited.');
        return DB::transaction(function () use ($po, $header, $lines, $actorId) {
            $po->fill($header); $po->updated_by = $actorId; $po->save();
            if (is_array($lines)) $this->syncPOLines($po, $lines);
            $this->recalcPO($po);
            return $po->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function deletePO(PurchaseOrder $po): void
    {
        if ($po->status !== PurchaseOrder::STATUS_DRAFT) throw new RuntimeException('Only draft POs can be deleted.');
        DB::transaction(fn() => $po->delete());
    }

    public function approvePO(PurchaseOrder $po, ?int $actorId = null): PurchaseOrder
    {
        if (! in_array($po->status, [PurchaseOrder::STATUS_DRAFT, PurchaseOrder::STATUS_SUBMITTED], true)) {
            throw new RuntimeException('Only draft/submitted POs can be approved.');
        }
        if (! $po->items()->exists()) throw new RuntimeException('Cannot approve a PO with no lines.');
        $po->forceFill([
            'status' => PurchaseOrder::STATUS_APPROVED,
            'approved_by' => $actorId, 'approved_at' => now(),
        ])->save();
        return $po->fresh(['items', 'partner', 'warehouse']);
    }

    public function cancelPO(PurchaseOrder $po, ?string $reason = null, ?int $actorId = null): PurchaseOrder
    {
        if ($po->grns()->whereIn('status', [Grn::STATUS_RECEIVED])->exists()) {
            throw new RuntimeException('Cannot cancel a PO that has received GRNs. Cancel GRNs first.');
        }
        $po->forceFill([
            'status' => PurchaseOrder::STATUS_CANCELLED,
            'cancelled_by' => $actorId, 'cancelled_at' => now(), 'cancellation_reason' => $reason,
        ])->save();
        return $po;
    }

    /* ---------------- GRN ---------------- */

    public function paginateGRN(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Grn::query()
            ->with(['partner:id,code,name', 'warehouse:id,code,name'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('code', 'like', $like)->orWhere('supplier_invoice_no', 'like', $like);
            }))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->orderByDesc('grn_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function createGRN(int $companyId, array $header, array $lines, ?int $actorId = null): Grn
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'grn', $header['code'] ?? null);
            $grn = Grn::create(array_merge($header, [
                'company_id' => $companyId,
                'code'       => $code,
                'status'     => Grn::STATUS_DRAFT,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));
            $this->syncGRNLines($grn, $lines);
            return $grn->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function updateGRN(Grn $grn, array $header, ?array $lines, ?int $actorId = null): Grn
    {
        if (! $grn->isEditable()) throw new RuntimeException('Only draft GRNs can be edited.');
        return DB::transaction(function () use ($grn, $header, $lines, $actorId) {
            $grn->fill($header); $grn->updated_by = $actorId; $grn->save();
            if (is_array($lines)) $this->syncGRNLines($grn, $lines);
            return $grn->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function deleteGRN(Grn $grn): void
    {
        if (! $grn->isEditable()) throw new RuntimeException('Only draft GRNs can be deleted.');
        DB::transaction(fn() => $grn->delete());
    }

    /** Receive GRN — writes one stock_ledger IN row per line. */
    public function receiveGRN(Grn $grn, ?int $actorId = null): Grn
    {
        if ($grn->status !== Grn::STATUS_DRAFT) throw new RuntimeException('Only draft GRNs can be received.');
        if (! $grn->items()->exists())          throw new RuntimeException('Cannot receive a GRN with no lines.');

        return DB::transaction(function () use ($grn, $actorId) {
            foreach ($grn->items as $line) {
                if ((float) $line->qty <= 0) continue;
                $ledger = $this->stock->record([
                    'company_id'     => $grn->company_id,
                    'warehouse_id'   => $grn->warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::IN,
                    'qty'            => (float) $line->qty,
                    'rate'           => (float) $line->rate,
                    'reference_type' => Grn::class,
                    'reference_id'   => $grn->id,
                    'reference_no'   => $grn->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'serial_no'      => $line->serial_no,
                    'posted_at'      => $grn->grn_date,
                    'notes'          => "GRN {$grn->code}",
                    'created_by'     => $actorId,
                ]);
                $line->forceFill(['ledger_id' => $ledger->id])->save();

                // Bump the matched PO line's received_qty (if any)
                if ($line->purchase_order_item_id) {
                    PurchaseOrderItem::where('id', $line->purchase_order_item_id)
                        ->increment('received_qty', (float) $line->qty);
                }
            }

            // Update PO status (partial vs received)
            if ($grn->purchase_order_id) {
                $this->refreshPOReceiptStatus($grn->purchase_order_id);
            }

            $grn->forceFill([
                'status' => Grn::STATUS_RECEIVED,
                'received_by' => $actorId, 'received_at' => now(),
            ])->save();
            return $grn->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function cancelGRN(Grn $grn, ?string $reason = null, ?int $actorId = null): Grn
    {
        if ($grn->status === Grn::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        return DB::transaction(function () use ($grn, $reason, $actorId) {
            if ($grn->status === Grn::STATUS_RECEIVED) {
                foreach ($grn->items as $line) {
                    if ($line->ledger_id) {
                        $this->stock->reverse($line->ledger_id, "Cancelled GRN {$grn->code}", $actorId);
                    }
                    if ($line->purchase_order_item_id) {
                        PurchaseOrderItem::where('id', $line->purchase_order_item_id)
                            ->decrement('received_qty', (float) $line->qty);
                    }
                }
                if ($grn->purchase_order_id) $this->refreshPOReceiptStatus($grn->purchase_order_id);
            }
            $grn->forceFill([
                'status' => Grn::STATUS_CANCELLED,
                'cancelled_by' => $actorId, 'cancelled_at' => now(), 'cancellation_reason' => $reason,
            ])->save();
            return $grn;
        });
    }

    /* ---------------- PURCHASE INVOICE ---------------- */

    public function paginatePI(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return PurchaseInvoice::query()
            ->with(['partner:id,code,name'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->orderByDesc('invoice_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function createPI(int $companyId, array $header, array $lines, ?int $actorId = null): PurchaseInvoice
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'purchase_invoice', $header['code'] ?? null);
            $pi = PurchaseInvoice::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => PurchaseInvoice::STATUS_DRAFT,
                'currency' => $header['currency'] ?? 'INR',
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncPILines($pi, $lines);
            $this->recalcPI($pi);
            return $pi->fresh(['items', 'partner']);
        });
    }

    public function updatePI(PurchaseInvoice $pi, array $header, ?array $lines, ?int $actorId = null): PurchaseInvoice
    {
        if (! $pi->isEditable()) throw new RuntimeException('Only draft purchase invoices can be edited.');
        return DB::transaction(function () use ($pi, $header, $lines, $actorId) {
            $pi->fill($header); $pi->updated_by = $actorId; $pi->save();
            if (is_array($lines)) $this->syncPILines($pi, $lines);
            $this->recalcPI($pi);
            return $pi->fresh(['items', 'partner']);
        });
    }

    public function deletePI(PurchaseInvoice $pi): void
    {
        if (! $pi->isEditable()) throw new RuntimeException('Only draft purchase invoices can be deleted.');
        DB::transaction(fn() => $pi->delete());
    }

    public function postPI(PurchaseInvoice $pi, ?int $actorId = null): PurchaseInvoice
    {
        if ($pi->status !== PurchaseInvoice::STATUS_DRAFT) throw new RuntimeException('Only draft PIs can be posted.');
        if (! $pi->items()->exists()) throw new RuntimeException('Cannot post a PI with no lines.');
        $pi->forceFill([
            'status' => PurchaseInvoice::STATUS_POSTED,
            'posted_at' => now(),
            'balance' => (float) $pi->total - (float) $pi->paid_amount,
        ])->save();
        event(new PurchaseInvoicePosted($pi->fresh()));
        return $pi;
    }

    public function cancelPI(PurchaseInvoice $pi, ?string $reason = null, ?int $actorId = null): PurchaseInvoice
    {
        if ($pi->status === PurchaseInvoice::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        $pi->forceFill([
            'status' => PurchaseInvoice::STATUS_CANCELLED,
            'cancelled_by' => $actorId, 'cancelled_at' => now(), 'cancellation_reason' => $reason,
        ])->save();
        return $pi;
    }

    /* ---------------- SUPPLIER PAYMENT ---------------- */

    /** Record a single payment against ONE purchase invoice. Returns the created payment row. */
    public function recordPIPayment(PurchaseInvoice $pi, array $data, ?int $actorId = null): PurchaseInvoicePayment
    {
        if ($pi->status === PurchaseInvoice::STATUS_DRAFT) {
            throw new RuntimeException('Cannot pay a draft purchase invoice. Post it first.');
        }
        if ($pi->status === PurchaseInvoice::STATUS_CANCELLED) {
            throw new RuntimeException('Cannot pay a cancelled purchase invoice.');
        }
        $amount = (float) $data['amount'];
        if ($amount <= 0) throw new RuntimeException('Payment amount must be positive.');
        if ($amount > (float) $pi->balance + 0.01) {
            throw new RuntimeException('Payment exceeds outstanding balance.');
        }
        return DB::transaction(function () use ($pi, $data, $amount, $actorId) {
            $payment = PurchaseInvoicePayment::create([
                'company_id'          => $pi->company_id,
                'purchase_invoice_id' => $pi->id,
                'partner_id'          => $pi->partner_id,
                'payment_date'        => $data['payment_date'] ?? now()->toDateString(),
                'amount'              => $amount,
                'mode'                => $data['mode'] ?? 'bank',
                'reference'           => $data['reference'] ?? null,
                'currency'            => $data['currency'] ?? $pi->currency,
                'exchange_rate'       => $data['exchange_rate'] ?? 1,
                'notes'               => $data['notes'] ?? null,
                'created_by'          => $actorId,
            ]);

            $newPaid    = round((float) $pi->paid_amount + $amount, 2);
            $newBalance = round((float) $pi->total - $newPaid, 2);
            $newStatus  = $newBalance <= 0.0001 ? PurchaseInvoice::STATUS_PAID : PurchaseInvoice::STATUS_PARTIALLY_PAID;
            $pi->forceFill([
                'paid_amount' => $newPaid,
                'balance'     => $newBalance,
                'status'      => $newStatus,
            ])->save();

            event(new PurchaseInvoicePaymentMade($payment->fresh(['purchaseInvoice'])));
            return $payment;
        });
    }

    public function deletePIPayment(PurchaseInvoicePayment $p): void
    {
        DB::transaction(function () use ($p) {
            $pi = $p->purchaseInvoice;
            $newPaid    = round((float) $pi->paid_amount - (float) $p->amount, 2);
            $newBalance = round((float) $pi->total - $newPaid, 2);
            $newStatus  = $newPaid <= 0.0001 ? PurchaseInvoice::STATUS_POSTED : ($newBalance <= 0.0001 ? PurchaseInvoice::STATUS_PAID : PurchaseInvoice::STATUS_PARTIALLY_PAID);
            $p->delete();
            $pi->forceFill([
                'paid_amount' => max(0.0, $newPaid),
                'balance'     => $newBalance,
                'status'      => $newStatus,
            ])->save();
        });
    }

    /**
     * Apply a lump-sum payment across many open Purchase Invoices for one partner.
     * Allocates oldest-due-first until the total is exhausted. Throws if total exceeds
     * the sum of open balances. Returns the list of created PurchaseInvoicePayment rows.
     *
     * @param array{ partner_id:int, amount:float, payment_date?:string, mode?:string,
     *               reference?:string, notes?:string } $data
     * @return PurchaseInvoicePayment[]
     */
    public function recordSupplierBulkPayment(int $companyId, array $data, ?int $actorId = null): array
    {
        $partnerId = (int) $data['partner_id'];
        $total = (float) $data['amount'];
        if ($total <= 0) throw new RuntimeException('Bulk payment amount must be positive.');

        $open = PurchaseInvoice::query()
            ->where('company_id', $companyId)
            ->where('partner_id', $partnerId)
            ->whereIn('status', [PurchaseInvoice::STATUS_POSTED, PurchaseInvoice::STATUS_PARTIALLY_PAID])
            ->orderBy('invoice_date')->orderBy('id')
            ->get();

        $totalOutstanding = (float) $open->sum('balance');
        if ($total > $totalOutstanding + 0.01) {
            throw new RuntimeException("Amount {$total} exceeds total open balance {$totalOutstanding} for this supplier.");
        }

        $created = [];
        $remaining = $total;
        foreach ($open as $pi) {
            if ($remaining <= 0.001) break;
            $apply = min($remaining, (float) $pi->balance);
            if ($apply <= 0.001) continue;
            $created[] = $this->recordPIPayment($pi, array_merge($data, ['amount' => $apply]), $actorId);
            $remaining = round($remaining - $apply, 2);
        }
        return $created;
    }

    /* ---------------- helpers ---------------- */

    private function syncPOLines(PurchaseOrder $po, array $lines): void
    {
        $po->items()->delete();
        foreach ($lines as $row) {
            $qty = (float) $row['qty']; $rate = (float) ($row['rate'] ?? 0);
            $disc = (float) ($row['discount_pct'] ?? 0); $tax = (float) ($row['tax_rate'] ?? 0);
            $sub = round($qty * $rate * (1 - $disc / 100), 2);
            $taxAmount = round($sub * $tax / 100, 2);
            PurchaseOrderItem::create([
                'purchase_order_id' => $po->id,
                'product_id'        => $row['product_id'],
                'hsn_code'          => $row['hsn_code'] ?? null,
                'unit_id'           => $row['unit_id'] ?? null,
                'qty'               => $qty,
                'rate'              => $rate,
                'discount_pct'      => $disc,
                'tax_rate'          => $tax,
                'line_subtotal'     => $sub,
                'tax_amount'        => $taxAmount,
                'line_total'        => $sub + $taxAmount,
                'notes'             => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalcPO(PurchaseOrder $po): void
    {
        $items = $po->items()->get();
        $sub = $items->sum('line_subtotal');
        $tax = $items->sum('tax_amount');
        $total = $sub + $tax + (float) $po->shipping - (float) $po->discount;
        $po->forceFill([
            'subtotal'   => round($sub, 2),
            'tax_amount' => round($tax, 2),
            'total'      => round($total, 2),
        ])->save();
    }

    private function syncGRNLines(Grn $grn, array $lines): void
    {
        $grn->items()->delete();
        foreach ($lines as $row) {
            $qty = (float) $row['qty']; $rate = (float) ($row['rate'] ?? 0);
            GrnItem::create([
                'grn_id'                 => $grn->id,
                'purchase_order_item_id' => $row['purchase_order_item_id'] ?? null,
                'product_id'             => $row['product_id'],
                'hsn_code'               => $row['hsn_code'] ?? null,
                'qty'                    => $qty,
                'rate'                   => $rate,
                'line_total'             => round($qty * $rate, 2),
                'batch_no'               => $row['batch_no'] ?? null,
                'expiry_date'            => $row['expiry_date'] ?? null,
                'manufacturing_date'     => $row['manufacturing_date'] ?? null,
                'serial_no'              => $row['serial_no'] ?? null,
                'notes'                  => $row['notes'] ?? null,
            ]);
        }
    }

    private function syncPILines(PurchaseInvoice $pi, array $lines): void
    {
        $pi->items()->delete();
        foreach ($lines as $row) {
            $qty = (float) $row['qty']; $rate = (float) ($row['rate'] ?? 0);
            $disc = (float) ($row['discount_pct'] ?? 0); $tax = (float) ($row['tax_rate'] ?? 0);
            $sub = round($qty * $rate * (1 - $disc / 100), 2);
            $taxAmount = round($sub * $tax / 100, 2);
            PurchaseInvoiceItem::create([
                'purchase_invoice_id' => $pi->id,
                'product_id'          => $row['product_id'],
                'hsn_code'            => $row['hsn_code'] ?? null,
                'qty'                 => $qty,
                'rate'                => $rate,
                'discount_pct'        => $disc,
                'tax_rate'            => $tax,
                'line_subtotal'       => $sub,
                'tax_amount'          => $taxAmount,
                'line_total'          => $sub + $taxAmount,
                'notes'               => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalcPI(PurchaseInvoice $pi): void
    {
        $items = $pi->items()->get();
        $sub = $items->sum('line_subtotal');
        $tax = $items->sum('tax_amount');
        $total = $sub + $tax + (float) $pi->shipping - (float) $pi->discount;
        $pi->forceFill([
            'subtotal'   => round($sub, 2),
            'tax_amount' => round($tax, 2),
            'total'      => round($total, 2),
            'balance'    => round($total - (float) $pi->paid_amount, 2),
        ])->save();
    }

    private function refreshPOReceiptStatus(int $poId): void
    {
        $po = PurchaseOrder::find($poId);
        if (! $po) return;
        $items = $po->items;
        $allReceived = $items->every(fn($it) => (float) $it->received_qty >= (float) $it->qty);
        $someReceived = $items->contains(fn($it) => (float) $it->received_qty > 0);
        if ($allReceived) {
            $po->forceFill(['status' => PurchaseOrder::STATUS_RECEIVED])->save();
        } elseif ($someReceived) {
            $po->forceFill(['status' => PurchaseOrder::STATUS_PARTIAL])->save();
        } else {
            $po->forceFill(['status' => PurchaseOrder::STATUS_APPROVED])->save();
        }
    }
}
