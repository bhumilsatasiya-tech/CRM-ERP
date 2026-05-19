<?php

namespace Modules\Finance\Listeners;

use Modules\Export\Models\ExportInvoice;
use Modules\Finance\Services\JournalService;
use Modules\InterCompany\Models\InterCompanyInvoice;
use Modules\Irm\Models\BankRealization;
use Modules\Irm\Models\Irm;
use Modules\Production\Models\ProductionBatch;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Purchase\Models\PurchaseInvoicePayment;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Models\InvoicePayment;

/**
 * Single listener that takes an "event" (a typed object with a ->payload property
 * pointing to the source domain object) and auto-builds the journal entry.
 *
 * For each kind we resolve account ids via SettingService (config in JournalService::postFromReference).
 * If a setting is missing the listener silently skips and Laravel-logs a warning.
 */
class AutoJournalListener
{
    public function __construct(private JournalService $journals) {}

    public function onInvoicePosted($event): void
    {
        $i = $event->invoice;
        $taxLine = (float) $i->tax_amount > 0 ? [
            ['settings_key' => 'finance.default_tax_output_account_id', 'credit' => (float) $i->tax_amount, 'narration' => 'Output tax'],
        ] : [];
        $this->journals->postFromReference(
            $i->company_id, Invoice::class, $i->id, $i->code,
            $i->invoice_date?->toDateString() ?? now()->toDateString(),
            "Sale invoice {$i->code}",
            array_merge([
                ['settings_key' => 'finance.default_ar_account_id', 'debit'  => (float) $i->total, 'narration' => 'AR'],
                ['settings_key' => 'finance.default_revenue_account_id', 'credit' => (float) $i->subtotal - (float) $i->discount, 'narration' => 'Revenue'],
            ], $taxLine),
            null
        );
    }

    public function onPurchaseInvoicePosted($event): void
    {
        $pi = $event->invoice;
        $taxLine = (float) $pi->tax_amount > 0 ? [
            ['settings_key' => 'finance.default_tax_input_account_id', 'debit' => (float) $pi->tax_amount, 'narration' => 'Input tax'],
        ] : [];
        $this->journals->postFromReference(
            $pi->company_id, PurchaseInvoice::class, $pi->id, $pi->code,
            $pi->invoice_date?->toDateString() ?? now()->toDateString(),
            "Purchase invoice {$pi->code}",
            array_merge([
                ['settings_key' => 'finance.default_purchase_expense_account_id', 'debit' => (float) $pi->subtotal - (float) $pi->discount, 'narration' => 'Purchase expense'],
            ], $taxLine, [
                ['settings_key' => 'finance.default_ap_account_id', 'credit' => (float) $pi->total, 'narration' => 'AP'],
            ]),
            null
        );
    }

    public function onPaymentReceived($event): void
    {
        $p = $event->payment;
        $bankSetting = ($p->mode === 'cash')
            ? 'finance.default_cash_account_id'
            : 'finance.default_bank_account_id';
        $this->journals->postFromReference(
            $p->company_id, InvoicePayment::class, $p->id, "RCT/{$p->id}",
            $p->payment_date?->toDateString() ?? now()->toDateString(),
            "Receipt against invoice {$p->invoice_id}",
            [
                ['settings_key' => $bankSetting, 'debit' => (float) $p->amount, 'narration' => 'Bank/Cash'],
                ['settings_key' => 'finance.default_ar_account_id', 'credit' => (float) $p->amount, 'narration' => 'AR settlement'],
            ],
            null
        );
    }

    public function onPurchaseInvoicePayment($event): void
    {
        $p = $event->payment;
        $bankSetting = ($p->mode === 'cash')
            ? 'finance.default_cash_account_id'
            : 'finance.default_bank_account_id';
        $this->journals->postFromReference(
            $p->company_id, PurchaseInvoicePayment::class, $p->id, "PAY/{$p->id}",
            $p->payment_date?->toDateString() ?? now()->toDateString(),
            "Payment made against purchase invoice {$p->purchase_invoice_id}",
            [
                ['settings_key' => 'finance.default_ap_account_id', 'debit'  => (float) $p->amount, 'narration' => 'AP settlement'],
                ['settings_key' => $bankSetting,                    'credit' => (float) $p->amount, 'narration' => 'Bank/Cash'],
            ],
            null
        );
    }

    public function onIrmReceived($event): void
    {
        $irm = $event->irm;
        $this->journals->postFromReference(
            $irm->company_id, Irm::class, $irm->id, $irm->code,
            $irm->irm_date?->toDateString() ?? now()->toDateString(),
            "IRM {$irm->code} received",
            [
                ['settings_key' => 'finance.default_bank_account_id', 'debit' => (float) $irm->irm_amount_inr, 'narration' => 'Bank (FCY)'],
                ['settings_key' => 'finance.default_export_ar_account_id', 'credit' => (float) $irm->irm_amount_inr, 'narration' => 'Export AR settlement'],
            ],
            null
        );
    }

    public function onBankRealization($event): void
    {
        $r = $event->realization;
        $lines = [
            ['settings_key' => 'finance.default_bank_account_id', 'debit' => (float) $r->net_inr, 'narration' => 'Net realized INR'],
        ];
        if ((float) $r->commission > 0) {
            $lines[] = ['settings_key' => 'finance.default_purchase_expense_account_id', 'debit' => (float) $r->commission, 'narration' => 'Bank commission'];
        }
        if ((float) $r->tds > 0) {
            $lines[] = ['settings_key' => 'finance.default_purchase_expense_account_id', 'debit' => (float) $r->tds, 'narration' => 'TDS withheld'];
        }
        $lines[] = ['settings_key' => 'finance.default_bank_account_id', 'credit' => (float) $r->net_inr + (float) $r->commission + (float) $r->tds, 'narration' => 'Bank-FCY → INR'];
        $this->journals->postFromReference(
            $r->company_id, BankRealization::class, $r->id, "REAL/{$r->id}",
            $r->realization_date?->toDateString() ?? now()->toDateString(),
            "Bank realization (IRM #{$r->irm_id})",
            $lines, null
        );
    }

    public function onBatchCompleted($event): void
    {
        $b = $event->batch;
        $rawCost = (float) $b->material_cost;
        if ($rawCost <= 0) return;
        $this->journals->postFromReference(
            $b->company_id, ProductionBatch::class, $b->id, $b->code,
            $b->actual_end_date?->toDateString() ?? now()->toDateString(),
            "Production batch {$b->code} completion",
            [
                ['settings_key' => 'finance.default_inventory_account_id', 'debit'  => $rawCost, 'narration' => 'Finished goods inventory in'],
                ['settings_key' => 'finance.default_inventory_account_id', 'credit' => $rawCost, 'narration' => 'Raw materials inventory out'],
            ],
            null
        );
    }

    public function onIciPosted($event): void
    {
        $ici = $event->ici;
        $this->journals->postFromReference(
            $ici->from_company_id, InterCompanyInvoice::class, $ici->id, $ici->code,
            $ici->invoice_date?->toDateString() ?? now()->toDateString(),
            "Inter-company invoice {$ici->code} (seller side)",
            [
                ['settings_key' => 'finance.default_ar_account_id', 'debit' => (float) $ici->total, 'narration' => 'AR (inter-co buyer)'],
                ['settings_key' => 'finance.default_revenue_account_id', 'credit' => (float) $ici->total, 'narration' => 'Inter-company revenue'],
            ],
            null
        );
    }

    public function onSalaryRunPosted($event): void
    {
        $r = $event->run;
        $totalGross = (float) ($r->payslips()->sum('gross') ?? 0);
        $totalDed   = (float) ($r->payslips()->sum('total_deductions') ?? 0);
        $totalNet   = (float) ($r->payslips()->sum('net_pay') ?? 0);
        if ($totalGross <= 0) return;
        $this->journals->postFromReference(
            $r->company_id, get_class($r), $r->id, $r->code,
            $r->period_end?->toDateString() ?? now()->toDateString(),
            "Salary run {$r->code}",
            [
                ['settings_key' => 'finance.default_salary_expense_account_id', 'debit' => $totalGross, 'narration' => 'Salary expense (gross)'],
                ['settings_key' => 'finance.default_salary_payable_account_id', 'credit' => $totalNet, 'narration' => 'Salary payable (net)'],
                // Deductions parked in salary payable for now — detailed split deferred.
                ['settings_key' => 'finance.default_salary_payable_account_id', 'credit' => $totalDed, 'narration' => 'Statutory deductions payable'],
            ],
            null
        );
    }

    public function onLoanPaymentReceived($event): void
    {
        $p = $event->payment;
        $loan = $p->loan;
        $isBorrowed = $loan?->type === 'borrowed';
        $bankSetting = 'finance.default_bank_account_id';
        $loanAcctSetting = 'finance.default_ap_account_id'; // simple: borrowed = liability
        $lines = $isBorrowed
            ? [
                ['settings_key' => $loanAcctSetting, 'debit'  => (float) $p->amount, 'narration' => 'Loan principal/EMI repayment'],
                ['settings_key' => $bankSetting,     'credit' => (float) $p->amount, 'narration' => 'Paid from bank'],
            ]
            : [
                ['settings_key' => $bankSetting,     'debit'  => (float) $p->amount, 'narration' => 'Loan repayment received'],
                ['settings_key' => 'finance.default_ar_account_id', 'credit' => (float) $p->amount, 'narration' => 'Loan AR settlement'],
            ];
        $this->journals->postFromReference(
            $loan->company_id, get_class($p), $p->id, "LOANPAY/{$p->id}",
            $p->payment_date?->toDateString() ?? now()->toDateString(),
            "Loan payment ({$loan->code})",
            $lines, null
        );
    }
}
