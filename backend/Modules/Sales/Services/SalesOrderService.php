<?php

namespace Modules\Sales\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Quotation\Models\Quotation;
use Modules\Sales\Models\SalesOrder;
use Modules\Sales\Models\SalesOrderItem;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class SalesOrderService
{
    public function __construct(private SequenceService $sequences) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return SalesOrder::query()
            ->with(['partner:id,code,name', 'warehouse:id,code,name'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('code', 'like', $like)->orWhere('reference', 'like', $like);
            }))
            ->when(($filters['status']     ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['partner_id'] ?? null), fn(Builder $q) => $q->where('partner_id', (int) $filters['partner_id']))
            ->orderByDesc('order_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): SalesOrder
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'sales_order', $header['code'] ?? null);
            $so = SalesOrder::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => SalesOrder::STATUS_DRAFT,
                'currency' => $header['currency'] ?? 'INR',
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncLines($so, $lines);
            $this->recalc($so);
            return $so->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function update(SalesOrder $so, array $header, ?array $lines, ?int $actorId = null): SalesOrder
    {
        if (! $so->isEditable()) throw new RuntimeException('Only draft/submitted SOs can be edited.');
        return DB::transaction(function () use ($so, $header, $lines, $actorId) {
            $so->fill($header); $so->updated_by = $actorId; $so->save();
            if (is_array($lines)) $this->syncLines($so, $lines);
            $this->recalc($so);
            return $so->fresh(['items', 'partner', 'warehouse']);
        });
    }

    public function delete(SalesOrder $so): void
    {
        if ($so->status !== SalesOrder::STATUS_DRAFT) throw new RuntimeException('Only draft SOs can be deleted.');
        DB::transaction(fn() => $so->delete());
    }

    public function approve(SalesOrder $so, ?int $actorId = null): SalesOrder
    {
        if (! in_array($so->status, [SalesOrder::STATUS_DRAFT, SalesOrder::STATUS_SUBMITTED], true)) {
            throw new RuntimeException('Only draft/submitted SOs can be approved.');
        }
        if (! $so->items()->exists()) throw new RuntimeException('Cannot approve a SO with no lines.');
        $so->forceFill([
            'status' => SalesOrder::STATUS_APPROVED,
            'approved_by' => $actorId, 'approved_at' => now(),
        ])->save();
        return $so;
    }

    public function cancel(SalesOrder $so, ?string $reason = null, ?int $actorId = null): SalesOrder
    {
        if ($so->invoices()->whereNotIn('status', ['cancelled', 'draft'])->exists()) {
            throw new RuntimeException('Cannot cancel a SO that has posted invoices. Cancel invoices first.');
        }
        $so->forceFill([
            'status' => SalesOrder::STATUS_CANCELLED,
            'cancelled_by' => $actorId, 'cancelled_at' => now(), 'cancellation_reason' => $reason,
        ])->save();
        return $so;
    }

    /** Build a Sales Order from an approved Quotation. */
    public function createFromQuotation(Quotation $q, ?int $actorId = null): SalesOrder
    {
        return DB::transaction(function () use ($q, $actorId) {
            $code = $this->sequences->next($q->company_id, 'sales_order');
            $so = SalesOrder::create([
                'company_id'    => $q->company_id,
                'code'          => $code,
                'partner_id'    => $q->partner_id,
                'quotation_id'  => $q->id,
                'order_date'    => now()->toDateString(),
                'reference'     => $q->reference,
                'currency'      => $q->currency,
                'exchange_rate' => $q->exchange_rate,
                'discount'      => $q->discount,
                'shipping'      => $q->shipping,
                'terms_and_conditions' => $q->terms_and_conditions,
                'notes'         => $q->notes,
                'status'        => SalesOrder::STATUS_DRAFT,
                'created_by'    => $actorId,
                'updated_by'    => $actorId,
            ]);
            foreach ($q->items as $line) {
                SalesOrderItem::create([
                    'sales_order_id' => $so->id,
                    'product_id'     => $line->product_id,
                    'hsn_code'       => $line->hsn_code,
                    'qty'            => $line->qty,
                    'rate'           => $line->rate,
                    'discount_pct'   => $line->discount_pct,
                    'tax_rate'       => $line->tax_rate,
                    'line_subtotal'  => $line->line_subtotal,
                    'tax_amount'     => $line->tax_amount,
                    'line_total'     => $line->line_total,
                    'notes'          => $line->notes,
                ]);
            }
            $this->recalc($so);
            return $so->fresh(['items']);
        });
    }

    public function recalcInvoiceProgress(SalesOrder $so): void
    {
        $items = $so->items;
        $allInvoiced = $items->every(fn($it) => (float) $it->invoiced_qty >= (float) $it->qty);
        $someInvoiced = $items->contains(fn($it) => (float) $it->invoiced_qty > 0);
        $invoicedAmount = (float) $so->invoices()->where('status', '!=', 'cancelled')->sum('total');
        $newStatus = $so->status;
        if ($allInvoiced) $newStatus = SalesOrder::STATUS_INVOICED;
        elseif ($someInvoiced) $newStatus = SalesOrder::STATUS_PARTIAL;
        elseif ($newStatus === SalesOrder::STATUS_PARTIAL) $newStatus = SalesOrder::STATUS_APPROVED;
        $so->forceFill(['invoiced_amount' => round($invoicedAmount, 2), 'status' => $newStatus])->save();
    }

    private function syncLines(SalesOrder $so, array $lines): void
    {
        $so->items()->delete();
        foreach ($lines as $row) {
            $qty = (float) $row['qty']; $rate = (float) ($row['rate'] ?? 0);
            $disc = (float) ($row['discount_pct'] ?? 0); $tax = (float) ($row['tax_rate'] ?? 0);
            $sub = round($qty * $rate * (1 - $disc / 100), 2);
            $taxAmount = round($sub * $tax / 100, 2);
            SalesOrderItem::create([
                'sales_order_id' => $so->id,
                'product_id'     => $row['product_id'],
                'hsn_code'       => $row['hsn_code'] ?? null,
                'qty'            => $qty,
                'rate'           => $rate,
                'discount_pct'   => $disc,
                'tax_rate'       => $tax,
                'line_subtotal'  => $sub,
                'tax_amount'     => $taxAmount,
                'line_total'     => $sub + $taxAmount,
                'notes'          => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalc(SalesOrder $so): void
    {
        $items = $so->items()->get();
        $sub = $items->sum('line_subtotal');
        $tax = $items->sum('tax_amount');
        $total = $sub + $tax + (float) $so->shipping - (float) $so->discount;
        $so->forceFill([
            'subtotal' => round($sub, 2), 'tax_amount' => round($tax, 2), 'total' => round($total, 2),
        ])->save();
    }
}
