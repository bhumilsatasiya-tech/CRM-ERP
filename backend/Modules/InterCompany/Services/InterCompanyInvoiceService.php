<?php

namespace Modules\InterCompany\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\InterCompany\Events\InterCompanyInvoicePosted;
use Modules\InterCompany\Models\InterCompanyInvoice;
use Modules\InterCompany\Models\InterCompanyInvoiceItem;
use Modules\Inventory\Models\StockLedger;
use Modules\Inventory\Services\StockService;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Purchase\Models\PurchaseInvoiceItem;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Models\InvoiceItem;
use Modules\Settings\Services\SequenceService;
use Modules\Settings\Services\SettingService;
use RuntimeException;

class InterCompanyInvoiceService
{
    public function __construct(
        private StockService $stock,
        private SequenceService $sequences,
        private SettingService $settings,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return InterCompanyInvoice::query()
            ->with([
                'fromCompany:id,code,name', 'toCompany:id,code,name',
                'fromWarehouse:id,code,name', 'toWarehouse:id,code,name',
            ])
            ->withCount('items')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['from_company_id'] ?? null), fn(Builder $q, $v) => $q->where('from_company_id', (int) $v))
            ->when(($filters['to_company_id'] ?? null),   fn(Builder $q, $v) => $q->where('to_company_id', (int) $v))
            ->orderByDesc('invoice_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(array $header, array $lines, ?int $actorId = null): InterCompanyInvoice
    {
        if (count($lines) === 0) {
            throw new RuntimeException('At least one line is required.');
        }
        if (($header['from_company_id'] ?? 0) === ($header['to_company_id'] ?? 0)) {
            throw new RuntimeException('From-company and to-company must differ.');
        }
        return DB::transaction(function () use ($header, $lines, $actorId) {
            $code = $this->sequences->next((int) $header['from_company_id'], 'inter_company_invoice', $header['code'] ?? null);
            $ici = InterCompanyInvoice::create(array_merge($header, [
                'code'     => $code,
                'status'   => InterCompanyInvoice::STATUS_DRAFT,
                'currency' => $header['currency'] ?? 'INR',
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));
            $this->syncLines($ici, $lines, (float) ($header['profit_pct'] ?? 0));
            $this->recalc($ici);
            return $ici->fresh(['items.product', 'fromCompany', 'toCompany', 'fromWarehouse', 'toWarehouse']);
        });
    }

    public function update(InterCompanyInvoice $ici, array $header, ?array $lines, ?int $actorId = null): InterCompanyInvoice
    {
        if (! $ici->isEditable()) throw new RuntimeException('Only draft ICIs can be edited.');
        return DB::transaction(function () use ($ici, $header, $lines, $actorId) {
            $ici->fill($header); $ici->updated_by = $actorId; $ici->save();
            if (is_array($lines)) {
                $this->syncLines($ici, $lines, (float) ($header['profit_pct'] ?? $ici->profit_pct));
            }
            $this->recalc($ici);
            return $ici->fresh(['items.product', 'fromCompany', 'toCompany', 'fromWarehouse', 'toWarehouse']);
        });
    }

    public function delete(InterCompanyInvoice $ici): void
    {
        if (! $ici->isEditable()) throw new RuntimeException('Only draft ICIs can be deleted.');
        DB::transaction(fn() => $ici->delete());
    }

    /**
     * Post — the headline action. In a single transaction:
     *  1. Stock OUT from from_warehouse (under from_company_id context)
     *  2. Stock IN  to   to_warehouse  (under to_company_id   context)
     *  3. Create mirror Sale Invoice on from_company (links to seller's partner = "Co. A in B's CRM")
     *  4. Create mirror Purchase Invoice on to_company (links to supplier partner = "Co. B in A's CRM")
     *
     * Stock writes via StockService respect each ledger row's company_id.
     */
    public function post(InterCompanyInvoice $ici, ?int $actorId = null): InterCompanyInvoice
    {
        if ($ici->status !== InterCompanyInvoice::STATUS_DRAFT) {
            throw new RuntimeException('Only draft ICIs can be posted.');
        }
        if (! $ici->items()->exists()) {
            throw new RuntimeException('Cannot post an ICI with no lines.');
        }

        // Resolve mirror partners from settings BEFORE the transaction so we fail fast.
        $sellerPartnerId = $this->resolvePartnerId(
            $ici->from_company_id,
            "intercompany.partner_for_company_{$ici->to_company_id}",
            "the buyer (company id {$ici->to_company_id}) in the seller's CRM"
        );
        $buyerPartnerId = $this->resolvePartnerId(
            $ici->to_company_id,
            "intercompany.partner_for_company_{$ici->from_company_id}",
            "the seller (company id {$ici->from_company_id}) in the buyer's CRM"
        );

        return DB::transaction(function () use ($ici, $actorId, $sellerPartnerId, $buyerPartnerId) {
            // 1+2 — stock movements per line
            foreach ($ici->items as $line) {
                $outLedger = $this->stock->record([
                    'company_id'     => $ici->from_company_id,
                    'warehouse_id'   => $ici->from_warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::OUT,
                    'qty'            => (float) $line->qty,
                    'rate'           => (float) $line->cost_rate,
                    'reference_type' => InterCompanyInvoice::class,
                    'reference_id'   => $ici->id,
                    'reference_no'   => $ici->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'posted_at'      => now(),
                    'notes'          => "ICI {$ici->code} (out)",
                    'created_by'     => $actorId,
                ]);
                $inLedger = $this->stock->record([
                    'company_id'     => $ici->to_company_id,
                    'warehouse_id'   => $ici->to_warehouse_id,
                    'product_id'     => $line->product_id,
                    'movement_type'  => StockLedger::IN,
                    'qty'            => (float) $line->qty,
                    'rate'           => (float) $line->sell_rate,
                    'reference_type' => InterCompanyInvoice::class,
                    'reference_id'   => $ici->id,
                    'reference_no'   => $ici->code,
                    'batch_no'       => $line->batch_no,
                    'expiry_date'    => $line->expiry_date?->toDateString(),
                    'posted_at'      => now(),
                    'notes'          => "ICI {$ici->code} (in)",
                    'created_by'     => $actorId,
                ]);
                $line->forceFill([
                    'from_ledger_id' => $outLedger->id,
                    'to_ledger_id'   => $inLedger->id,
                ])->save();
            }

            // 3 — Sale invoice on from_company (seller's books)
            $saleCode = $this->sequences->next($ici->from_company_id, 'invoice');
            $saleInv = Invoice::create([
                'company_id'   => $ici->from_company_id,
                'code'         => $saleCode,
                'partner_id'   => $sellerPartnerId,
                'warehouse_id' => $ici->from_warehouse_id,
                'invoice_date' => $ici->invoice_date,
                'due_date'     => $ici->due_date,
                'reference'    => "ICI {$ici->code}",
                'currency'     => $ici->currency,
                'exchange_rate'=> (float) $ici->exchange_rate,
                'subtotal'     => (float) $ici->subtotal,
                'tax_amount'   => (float) $ici->tax_amount,
                'discount'     => 0, 'shipping' => 0,
                'total'        => (float) $ici->total,
                'paid_amount'  => 0,
                'balance'      => (float) $ici->total,
                'status'       => Invoice::STATUS_POSTED,
                'posted_at'    => now(),
                'notes'        => "Auto-created from inter-company invoice {$ici->code}",
                'created_by'   => $actorId, 'updated_by' => $actorId,
            ]);
            foreach ($ici->items as $line) {
                $sub = round((float) $line->qty * (float) $line->sell_rate, 2);
                $tax = round($sub * (float) $line->tax_rate / 100, 2);
                InvoiceItem::create([
                    'invoice_id'    => $saleInv->id,
                    'product_id'    => $line->product_id,
                    'hsn_code'      => $line->hsn_code,
                    'qty'           => (float) $line->qty,
                    'rate'          => (float) $line->sell_rate,
                    'discount_pct'  => 0, 'tax_rate' => (float) $line->tax_rate,
                    'line_subtotal' => $sub, 'tax_amount' => $tax, 'line_total' => $sub + $tax,
                    'batch_no'      => $line->batch_no,
                    'expiry_date'   => $line->expiry_date,
                    'ledger_id'     => $line->from_ledger_id,
                    'notes'         => $line->notes,
                ]);
            }

            // 4 — Purchase invoice on to_company (buyer's books)
            $piCode = $this->sequences->next($ici->to_company_id, 'purchase_invoice');
            $purchInv = PurchaseInvoice::create([
                'company_id'        => $ici->to_company_id,
                'code'              => $piCode,
                'partner_id'        => $buyerPartnerId,
                'invoice_date'      => $ici->invoice_date,
                'due_date'          => $ici->due_date,
                'supplier_invoice_no' => $ici->code,
                'currency'          => $ici->currency,
                'exchange_rate'     => (float) $ici->exchange_rate,
                'subtotal'          => (float) $ici->subtotal,
                'tax_amount'        => (float) $ici->tax_amount,
                'discount'          => 0, 'shipping' => 0,
                'total'             => (float) $ici->total,
                'paid_amount'       => 0,
                'balance'           => (float) $ici->total,
                'status'            => PurchaseInvoice::STATUS_POSTED,
                'posted_at'         => now(),
                'notes'             => "Auto-created from inter-company invoice {$ici->code}",
                'created_by'        => $actorId, 'updated_by' => $actorId,
            ]);
            foreach ($ici->items as $line) {
                $sub = round((float) $line->qty * (float) $line->sell_rate, 2);
                $tax = round($sub * (float) $line->tax_rate / 100, 2);
                PurchaseInvoiceItem::create([
                    'purchase_invoice_id' => $purchInv->id,
                    'product_id'          => $line->product_id,
                    'hsn_code'            => $line->hsn_code,
                    'qty'                 => (float) $line->qty,
                    'rate'                => (float) $line->sell_rate,
                    'discount_pct'        => 0, 'tax_rate' => (float) $line->tax_rate,
                    'line_subtotal'       => $sub, 'tax_amount' => $tax, 'line_total' => $sub + $tax,
                    'notes'               => $line->notes,
                ]);
            }

            // Stamp ICI
            $ici->forceFill([
                'status'                     => InterCompanyInvoice::STATUS_POSTED,
                'posted_at'                  => now(),
                'posted_by'                  => $actorId,
                'linked_sale_invoice_id'     => $saleInv->id,
                'linked_purchase_invoice_id' => $purchInv->id,
                'updated_by'                 => $actorId,
            ])->save();

            $fresh = $ici->fresh(['items.product', 'fromCompany', 'toCompany', 'fromWarehouse', 'toWarehouse', 'linkedSaleInvoice', 'linkedPurchaseInvoice']);
            event(new InterCompanyInvoicePosted($fresh));
            return $fresh;
        });
    }

    public function cancel(InterCompanyInvoice $ici, ?string $reason = null, ?int $actorId = null): InterCompanyInvoice
    {
        if ($ici->status === InterCompanyInvoice::STATUS_CANCELLED) {
            throw new RuntimeException('Already cancelled.');
        }

        return DB::transaction(function () use ($ici, $reason, $actorId) {
            if ($ici->status === InterCompanyInvoice::STATUS_POSTED) {
                // Reverse all stock movements
                foreach ($ici->items as $line) {
                    if ($line->from_ledger_id) {
                        $this->stock->reverse($line->from_ledger_id, "Cancelled ICI {$ici->code}", $actorId);
                    }
                    if ($line->to_ledger_id) {
                        $this->stock->reverse($line->to_ledger_id, "Cancelled ICI {$ici->code}", $actorId);
                    }
                }
                // Cancel the linked Sale + Purchase invoices (mark them cancelled, no stock impact since we already reversed)
                if ($ici->linked_sale_invoice_id) {
                    Invoice::where('id', $ici->linked_sale_invoice_id)->update([
                        'status' => Invoice::STATUS_CANCELLED,
                        'cancelled_by' => $actorId,
                        'cancelled_at' => now(),
                        'cancellation_reason' => "ICI {$ici->code} cancelled",
                    ]);
                }
                if ($ici->linked_purchase_invoice_id) {
                    PurchaseInvoice::where('id', $ici->linked_purchase_invoice_id)->update([
                        'status' => PurchaseInvoice::STATUS_CANCELLED,
                        'cancelled_by' => $actorId,
                        'cancelled_at' => now(),
                        'cancellation_reason' => "ICI {$ici->code} cancelled",
                    ]);
                }
            }
            $ici->forceFill([
                'status'              => InterCompanyInvoice::STATUS_CANCELLED,
                'cancelled_at'        => now(),
                'cancelled_by'        => $actorId,
                'cancellation_reason' => $reason,
                'updated_by'          => $actorId,
            ])->save();
            return $ici;
        });
    }

    /**
     * Resolve the partner_id (in $companyId's CRM) representing the counterpart company.
     * Looks up SettingService company-scope key.
     */
    private function resolvePartnerId(int $companyId, string $key, string $description): int
    {
        $partnerId = (int) $this->settings->get($key, null, null, $companyId);
        if ($partnerId <= 0) {
            throw new RuntimeException("Inter-company partner is not configured: please set company setting '{$key}' to point to {$description}.");
        }
        return $partnerId;
    }

    private function syncLines(InterCompanyInvoice $ici, array $lines, float $profitPct): void
    {
        $ici->items()->delete();
        foreach ($lines as $row) {
            $qty       = (float) $row['qty'];
            $costRate  = (float) ($row['cost_rate'] ?? 0);
            $sellRate  = isset($row['sell_rate'])
                ? (float) $row['sell_rate']
                : round($costRate * (1 + $profitPct / 100), 4);
            $tax       = (float) ($row['tax_rate'] ?? 0);
            $sub       = round($qty * $sellRate, 2);
            $taxAmount = round($sub * $tax / 100, 2);
            InterCompanyInvoiceItem::create([
                'inter_company_invoice_id' => $ici->id,
                'product_id'   => $row['product_id'],
                'hsn_code'     => $row['hsn_code'] ?? null,
                'qty'          => $qty,
                'cost_rate'    => $costRate,
                'sell_rate'    => $sellRate,
                'tax_rate'     => $tax,
                'line_subtotal'=> $sub, 'tax_amount' => $taxAmount, 'line_total' => $sub + $taxAmount,
                'batch_no'     => $row['batch_no'] ?? null,
                'expiry_date'  => $row['expiry_date'] ?? null,
                'notes'        => $row['notes'] ?? null,
            ]);
        }
    }

    private function recalc(InterCompanyInvoice $ici): void
    {
        $items = $ici->items()->get();
        $cost  = $items->sum(fn($l) => (float) $l->qty * (float) $l->cost_rate);
        $sub   = $items->sum('line_subtotal');
        $tax   = $items->sum('tax_amount');
        $total = $sub + $tax;
        $ici->forceFill([
            'cost_basis' => round($cost, 2),
            'subtotal'   => round($sub, 2),
            'tax_amount' => round($tax, 2),
            'total'      => round($total, 2),
        ])->save();
    }
}
