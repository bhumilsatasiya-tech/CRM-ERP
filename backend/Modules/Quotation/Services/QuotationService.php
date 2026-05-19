<?php

namespace Modules\Quotation\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Quotation\Models\Quotation;
use Modules\Quotation\Models\QuotationItem;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class QuotationService
{
    public function __construct(private SequenceService $sequences) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Quotation::query()
            ->with(['partner:id,code,name'])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('code', 'like', $like)->orWhere('reference', 'like', $like);
            }))
            ->when(($filters['status']     ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['partner_id'] ?? null), fn(Builder $q) => $q->where('partner_id', (int) $filters['partner_id']))
            ->orderByDesc('quotation_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $header, array $lines, ?int $actorId = null): Quotation
    {
        return DB::transaction(function () use ($companyId, $header, $lines, $actorId) {
            $code = $this->sequences->next($companyId, 'quotation', $header['code'] ?? null);
            $q = Quotation::create(array_merge($header, [
                'company_id' => $companyId, 'code' => $code,
                'status' => Quotation::STATUS_DRAFT,
                'currency' => $header['currency'] ?? 'INR',
                'created_by' => $actorId, 'updated_by' => $actorId,
            ]));
            $this->syncLines($q, $lines);
            $this->recalc($q);
            return $q->fresh(['items', 'partner']);
        });
    }

    public function update(Quotation $q, array $header, ?array $lines, ?int $actorId = null): Quotation
    {
        if (! $q->isEditable()) throw new RuntimeException('Only draft/submitted quotations can be edited.');
        return DB::transaction(function () use ($q, $header, $lines, $actorId) {
            $q->fill($header); $q->updated_by = $actorId; $q->save();
            if (is_array($lines)) $this->syncLines($q, $lines);
            $this->recalc($q);
            return $q->fresh(['items', 'partner']);
        });
    }

    public function delete(Quotation $q): void
    {
        if ($q->status !== Quotation::STATUS_DRAFT) throw new RuntimeException('Only draft quotations can be deleted.');
        DB::transaction(fn() => $q->delete());
    }

    public function approve(Quotation $q, ?int $actorId = null): Quotation
    {
        if (! in_array($q->status, [Quotation::STATUS_DRAFT, Quotation::STATUS_SUBMITTED], true)) {
            throw new RuntimeException('Only draft/submitted quotations can be approved.');
        }
        if (! $q->items()->exists()) throw new RuntimeException('Cannot approve a quotation with no lines.');
        $q->forceFill([
            'status' => Quotation::STATUS_APPROVED,
            'approved_by' => $actorId, 'approved_at' => now(),
        ])->save();
        return $q;
    }

    public function cancel(Quotation $q, ?string $reason = null, ?int $actorId = null): Quotation
    {
        if ($q->status === Quotation::STATUS_CONVERTED) throw new RuntimeException('Cannot cancel a converted quotation.');
        $q->forceFill([
            'status' => Quotation::STATUS_CANCELLED,
            'cancelled_by' => $actorId, 'cancelled_at' => now(), 'cancellation_reason' => $reason,
        ])->save();
        return $q;
    }

    private function syncLines(Quotation $q, array $lines): void
    {
        $q->items()->delete();
        foreach ($lines as $row) {
            $qty = (float) $row['qty']; $rate = (float) ($row['rate'] ?? 0);
            $disc = (float) ($row['discount_pct'] ?? 0); $tax = (float) ($row['tax_rate'] ?? 0);
            $sub = round($qty * $rate * (1 - $disc / 100), 2);
            $taxAmount = round($sub * $tax / 100, 2);
            QuotationItem::create([
                'quotation_id' => $q->id, 'product_id' => $row['product_id'],
                'hsn_code' => $row['hsn_code'] ?? null,
                'qty' => $qty, 'rate' => $rate,
                'discount_pct' => $disc, 'tax_rate' => $tax,
                'line_subtotal' => $sub, 'tax_amount' => $taxAmount, 'line_total' => $sub + $taxAmount,
                'notes' => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalc(Quotation $q): void
    {
        $items = $q->items()->get();
        $sub = $items->sum('line_subtotal');
        $tax = $items->sum('tax_amount');
        $total = $sub + $tax + (float) $q->shipping - (float) $q->discount;
        $q->forceFill([
            'subtotal' => round($sub, 2),
            'tax_amount' => round($tax, 2),
            'total' => round($total, 2),
        ])->save();
    }
}
