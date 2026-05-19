<?php

namespace Modules\Finance\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Crm\Models\Partner;

/**
 * Builds a per-partner running statement from existing source documents:
 *   - Invoices (sale)
 *   - InvoicePayments
 *   - Purchase Invoices
 *   - IRMs (export remittance receipts)
 *
 * Convention:
 *   - Buyer/customer transactions: invoice posted = DEBIT (they owe us); payment received = CREDIT.
 *   - Supplier transactions: purchase invoice posted = CREDIT (we owe them); payment made = DEBIT.
 *   - Running balance is computed by accumulating (debit − credit). For a buyer, positive balance
 *     means they owe us; for a supplier, negative balance means we owe them.
 *   - Cancelled documents are excluded.
 *
 * Returns rows + opening balance + closing balance + totals — ready for the frontend table.
 */
class PartnerStatementService
{
    public function build(int $companyId, Partner $partner, string $from, string $to): array
    {
        $fromDate = Carbon::parse($from)->startOfDay();
        $toDate   = Carbon::parse($to)->endOfDay();

        $rowsBefore = $this->collectRows($companyId, $partner, null, $fromDate->copy()->subSecond());
        $opening = $this->sumNet($rowsBefore);

        $rowsInPeriod = $this->collectRows($companyId, $partner, $fromDate, $toDate);

        // Sort chronologically; assign running balance starting at opening
        usort($rowsInPeriod, function ($a, $b) {
            $cmp = strcmp($a['date'], $b['date']);
            if ($cmp !== 0) return $cmp;
            return $a['ref_id'] <=> $b['ref_id'];
        });

        $running = $opening;
        $totalDr = 0.0;
        $totalCr = 0.0;
        foreach ($rowsInPeriod as &$r) {
            $running += $r['debit'] - $r['credit'];
            $r['running_balance'] = round($running, 2);
            $totalDr += $r['debit'];
            $totalCr += $r['credit'];
        }
        unset($r);

        return [
            'partner' => [
                'id'           => $partner->id,
                'code'         => $partner->code,
                'name'         => $partner->name,
                'type'         => $partner->type,
                'country'      => $partner->country,
                'currency'     => $partner->currency,
                'credit_limit' => (float) $partner->credit_limit,
            ],
            'period' => [
                'from' => $fromDate->toDateString(),
                'to'   => $toDate->toDateString(),
            ],
            'opening_balance' => round($opening, 2),
            'rows'            => $rowsInPeriod,
            'closing_balance' => round($running, 2),
            'totals' => [
                'total_debit'  => round($totalDr, 2),
                'total_credit' => round($totalCr, 2),
                'net'          => round($totalDr - $totalCr, 2),
            ],
        ];
    }

    /** Pull all transactional rows for this partner. If $from is null, only $to is applied (used for opening). */
    private function collectRows(int $companyId, Partner $partner, ?Carbon $from, Carbon $to): array
    {
        $rows = [];

        // Sales Invoices — debit (buyer owes us)
        $invoices = DB::table('invoices')
            ->where('company_id', $companyId)
            ->where('partner_id', $partner->id)
            ->whereIn('status', ['posted', 'partially_paid', 'paid'])
            ->whereNull('deleted_at')
            ->where('invoice_date', '<=', $to->toDateString())
            ->when($from, fn($q) => $q->where('invoice_date', '>=', $from->toDateString()))
            ->select(['id', 'code', 'invoice_date', 'total', 'narration', 'currency'])
            ->get();
        foreach ($invoices as $i) {
            $rows[] = [
                'date'      => (string) $i->invoice_date,
                'type'      => 'invoice',
                'ref_id'    => (int) $i->id,
                'ref_code'  => (string) $i->code,
                'narration' => (string) ($i->narration ?? 'Sales invoice'),
                'currency'  => (string) ($i->currency ?? 'INR'),
                'debit'     => (float) $i->total,
                'credit'    => 0.0,
            ];
        }

        // Invoice Payments — credit (buyer paid us)
        $invoicePayments = DB::table('invoice_payments as ip')
            ->join('invoices as i', 'i.id', '=', 'ip.invoice_id')
            ->where('i.company_id', $companyId)
            ->where('i.partner_id', $partner->id)
            ->whereNull('i.deleted_at')
            ->whereNull('ip.deleted_at')
            ->where('ip.payment_date', '<=', $to->toDateString())
            ->when($from, fn($q) => $q->where('ip.payment_date', '>=', $from->toDateString()))
            ->select(['ip.id', 'i.code as invoice_code', 'ip.payment_date', 'ip.amount', 'ip.mode', 'ip.reference'])
            ->get();
        foreach ($invoicePayments as $p) {
            $rows[] = [
                'date'      => (string) $p->payment_date,
                'type'      => 'invoice_payment',
                'ref_id'    => (int) $p->id,
                'ref_code'  => 'RCT-' . $p->invoice_code,
                'narration' => 'Receipt via ' . ($p->mode ?? 'bank') . ($p->reference ? ' (ref ' . $p->reference . ')' : ''),
                'currency'  => 'INR',
                'debit'     => 0.0,
                'credit'    => (float) $p->amount,
            ];
        }

        // Export Invoices — debit (overseas buyer owes us; INR equivalent)
        $exportInvoices = DB::table('export_invoices')
            ->where('company_id', $companyId)
            ->where('partner_id', $partner->id)
            ->whereIn('status', ['posted', 'partially_paid', 'paid'])
            ->whereNull('deleted_at')
            ->where('invoice_date', '<=', $to->toDateString())
            ->when($from, fn($q) => $q->where('invoice_date', '>=', $from->toDateString()))
            ->select(['id', 'code', 'invoice_date', 'total', 'currency', 'exchange_rate'])
            ->get();
        foreach ($exportInvoices as $i) {
            $inr = (float) $i->total * (float) ($i->exchange_rate ?? 1);
            $rows[] = [
                'date'      => (string) $i->invoice_date,
                'type'      => 'export_invoice',
                'ref_id'    => (int) $i->id,
                'ref_code'  => (string) $i->code,
                'narration' => 'Export invoice (' . $i->currency . ' ' . number_format((float) $i->total, 2) . ' @ ' . $i->exchange_rate . ')',
                'currency'  => 'INR',
                'debit'     => round($inr, 2),
                'credit'    => 0.0,
            ];
        }

        // IRMs — credit (overseas buyer paid us; usually via bank)
        $irms = DB::table('irms')
            ->where('company_id', $companyId)
            ->where('partner_id', $partner->id)
            ->whereIn('status', ['received', 'partially_allocated', 'allocated', 'closed'])
            ->whereNull('deleted_at')
            ->where('receipt_date', '<=', $to->toDateString())
            ->when($from, fn($q) => $q->where('receipt_date', '>=', $from->toDateString()))
            ->select(['id', 'code', 'receipt_date', 'amount_inr', 'amount_fcy', 'currency'])
            ->get();
        foreach ($irms as $r) {
            $rows[] = [
                'date'      => (string) $r->receipt_date,
                'type'      => 'irm',
                'ref_id'    => (int) $r->id,
                'ref_code'  => (string) $r->code,
                'narration' => 'IRM receipt (' . $r->currency . ' ' . number_format((float) $r->amount_fcy, 2) . ')',
                'currency'  => 'INR',
                'debit'     => 0.0,
                'credit'    => (float) $r->amount_inr,
            ];
        }

        // Purchase Invoices — credit (we owe supplier)
        $purchaseInvoices = DB::table('purchase_invoices')
            ->where('company_id', $companyId)
            ->where('partner_id', $partner->id)
            ->whereIn('status', ['posted', 'partially_paid', 'paid'])
            ->whereNull('deleted_at')
            ->where('invoice_date', '<=', $to->toDateString())
            ->when($from, fn($q) => $q->where('invoice_date', '>=', $from->toDateString()))
            ->select(['id', 'code', 'invoice_date', 'total', 'narration', 'currency'])
            ->get();
        foreach ($purchaseInvoices as $i) {
            $rows[] = [
                'date'      => (string) $i->invoice_date,
                'type'      => 'purchase_invoice',
                'ref_id'    => (int) $i->id,
                'ref_code'  => (string) $i->code,
                'narration' => (string) ($i->narration ?? 'Purchase invoice'),
                'currency'  => (string) ($i->currency ?? 'INR'),
                'debit'     => 0.0,
                'credit'    => (float) $i->total,
            ];
        }

        // Purchase Invoice Payments — debit (we paid supplier)
        $piPayments = DB::table('purchase_invoice_payments as pp')
            ->join('purchase_invoices as pi', 'pi.id', '=', 'pp.purchase_invoice_id')
            ->where('pi.company_id', $companyId)
            ->where('pi.partner_id', $partner->id)
            ->whereNull('pi.deleted_at')
            ->whereNull('pp.deleted_at')
            ->where('pp.payment_date', '<=', $to->toDateString())
            ->when($from, fn($q) => $q->where('pp.payment_date', '>=', $from->toDateString()))
            ->select(['pp.id', 'pi.code as invoice_code', 'pp.payment_date', 'pp.amount', 'pp.mode', 'pp.reference'])
            ->get();
        foreach ($piPayments as $p) {
            $rows[] = [
                'date'      => (string) $p->payment_date,
                'type'      => 'purchase_invoice_payment',
                'ref_id'    => (int) $p->id,
                'ref_code'  => 'PAY-' . $p->invoice_code,
                'narration' => 'Payment via ' . ($p->mode ?? 'bank') . ($p->reference ? ' (ref ' . $p->reference . ')' : ''),
                'currency'  => 'INR',
                'debit'     => (float) $p->amount,
                'credit'    => 0.0,
            ];
        }

        return $rows;
    }

    private function sumNet(array $rows): float
    {
        $net = 0.0;
        foreach ($rows as $r) $net += $r['debit'] - $r['credit'];
        return $net;
    }
}
