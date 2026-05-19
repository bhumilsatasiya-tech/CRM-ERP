<?php

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Finance\Services\JournalService;
use Modules\Purchase\Models\PurchaseInvoice;
use Modules\Purchase\Services\PurchaseService;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Services\InvoiceService;
use Modules\Settings\Services\SettingService;

/**
 * Voucher endpoints for bulk payment/receipt — pick a partner, see their open invoices,
 * apply one lump sum across them (oldest-first by default).
 *
 *  GET  /api/v1/vouchers/open-invoices?partner_id=&type=sales|purchase
 *  POST /api/v1/vouchers/supplier-payment   { partner_id, amount, payment_date, mode, reference, notes }
 *  POST /api/v1/vouchers/buyer-receipt      { partner_id, amount, payment_date, mode, reference, notes }
 */
class VoucherController extends Controller
{
    public function __construct(
        private PurchaseService $purchase,
        private InvoiceService $sales,
        private JournalService $journals,
        private SettingService $settings,
    ) {}

    public function openInvoices(Request $request): JsonResponse
    {
        if (! $request->user()?->can('finance.report.view')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $type = (string) $request->input('type', 'sales');
        $partnerId = (int) $request->input('partner_id', 0);
        if ($partnerId <= 0) abort(422, 'partner_id is required');

        if ($type === 'purchase') {
            $rows = PurchaseInvoice::query()
                ->where('company_id', $companyId)
                ->where('partner_id', $partnerId)
                ->whereIn('status', [PurchaseInvoice::STATUS_POSTED, PurchaseInvoice::STATUS_PARTIALLY_PAID])
                ->orderBy('invoice_date')->orderBy('id')
                ->get(['id', 'code', 'invoice_date', 'due_date', 'total', 'paid_amount', 'balance', 'currency', 'status']);
        } else {
            $rows = Invoice::query()
                ->where('company_id', $companyId)
                ->where('partner_id', $partnerId)
                ->whereIn('status', [Invoice::STATUS_POSTED, Invoice::STATUS_PARTIALLY_PAID])
                ->orderBy('invoice_date')->orderBy('id')
                ->get(['id', 'code', 'invoice_date', 'due_date', 'total', 'paid_amount', 'balance', 'currency', 'status']);
        }
        return response()->json(['data' => [
            'rows'              => $rows,
            'total_outstanding' => (float) $rows->sum('balance'),
            'count'             => $rows->count(),
        ]]);
    }

    public function supplierPayment(Request $request): JsonResponse
    {
        if (! $request->user()?->can('purchase.invoice.update')) abort(403);
        $data = $this->validateVoucher($request);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $created = $this->purchase->recordSupplierBulkPayment($companyId, $data, $request->user()?->id);
        return response()->json(['data' => [
            'payments_created' => count($created),
            'payment_ids'      => array_map(fn($p) => $p->id, $created),
            'total_applied'    => (float) array_sum(array_map(fn($p) => $p->amount, $created)),
        ]]);
    }

    public function buyerReceipt(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sales.invoice.update')) abort(403);
        $data = $this->validateVoucher($request);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $created = $this->sales->recordBuyerBulkReceipt($companyId, $data, $request->user()?->id);
        return response()->json(['data' => [
            'payments_created' => count($created),
            'payment_ids'      => array_map(fn($p) => $p->id, $created),
            'total_applied'    => (float) array_sum(array_map(fn($p) => $p->amount, $created)),
        ]]);
    }

    private function validateVoucher(Request $request): array
    {
        return $request->validate([
            'partner_id'    => ['required', 'integer', 'exists:partners,id'],
            'amount'        => ['required', 'numeric', 'gt:0'],
            'payment_date'  => ['nullable', 'date'],
            'mode'          => ['nullable', 'string', 'max:32'],
            'reference'     => ['nullable', 'string', 'max:128'],
            'currency'      => ['nullable', 'string', 'max:8'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'notes'         => ['nullable', 'string'],
        ]);
    }

    /**
     * Bank/Cash Receipt — money in NOT tied to a sales invoice.
     * Example: capital infusion, loan disbursement, interest income, refund received.
     * Posts: Dr Bank/Cash, Cr counter_account_id.
     */
    public function bankReceipt(Request $request): JsonResponse
    {
        if (! $request->user()?->can('finance.journal.create')) abort(403);
        $data = $this->validateBankOrExpense($request);
        $companyId = $this->companyId();
        $bankAccountId = $this->resolveBankOrCash($companyId, $data['mode'] ?? 'bank');
        $je = $this->buildAndPostJE(
            $companyId, $data, "Bank receipt", $request->user()?->id,
            [
                ['account_id' => $bankAccountId,             'debit'  => (float) $data['amount'], 'credit' => 0, 'narration' => 'Bank/Cash IN'],
                ['account_id' => (int) $data['account_id'], 'debit'  => 0, 'credit' => (float) $data['amount'], 'narration' => $data['notes'] ?? 'Counter-account'],
            ]
        );
        return response()->json(['data' => ['journal_entry_id' => $je->id, 'code' => $je->code]]);
    }

    /**
     * Expense Voucher — out-of-pocket / utility / office expense.
     * Posts: Dr expense_account_id, Cr Bank/Cash.
     */
    public function expense(Request $request): JsonResponse
    {
        if (! $request->user()?->can('finance.journal.create')) abort(403);
        $data = $this->validateBankOrExpense($request);
        $companyId = $this->companyId();
        $bankAccountId = $this->resolveBankOrCash($companyId, $data['mode'] ?? 'bank');
        $je = $this->buildAndPostJE(
            $companyId, $data, "Expense voucher", $request->user()?->id,
            [
                ['account_id' => (int) $data['account_id'], 'debit'  => (float) $data['amount'], 'credit' => 0, 'narration' => $data['notes'] ?? 'Expense'],
                ['account_id' => $bankAccountId,             'debit'  => 0, 'credit' => (float) $data['amount'], 'narration' => 'Paid from Bank/Cash'],
            ]
        );
        return response()->json(['data' => ['journal_entry_id' => $je->id, 'code' => $je->code]]);
    }

    /**
     * Contra Voucher — Bank↔Cash transfers, or between two bank accounts.
     * Posts: Dr to_account_id, Cr from_account_id.
     */
    public function contra(Request $request): JsonResponse
    {
        if (! $request->user()?->can('finance.journal.create')) abort(403);
        $data = $request->validate([
            'amount'           => ['required', 'numeric', 'gt:0'],
            'from_account_id'  => ['required', 'integer', 'exists:accounts,id', 'different:to_account_id'],
            'to_account_id'    => ['required', 'integer', 'exists:accounts,id'],
            'payment_date'     => ['nullable', 'date'],
            'reference'        => ['nullable', 'string', 'max:128'],
            'notes'            => ['nullable', 'string'],
        ]);
        $companyId = $this->companyId();
        $je = $this->buildAndPostJE(
            $companyId, $data, "Contra voucher", $request->user()?->id,
            [
                ['account_id' => (int) $data['to_account_id'],   'debit'  => (float) $data['amount'], 'credit' => 0, 'narration' => 'Transfer in'],
                ['account_id' => (int) $data['from_account_id'], 'debit'  => 0, 'credit' => (float) $data['amount'], 'narration' => 'Transfer out'],
            ]
        );
        return response()->json(['data' => ['journal_entry_id' => $je->id, 'code' => $je->code]]);
    }

    private function validateBankOrExpense(Request $request): array
    {
        return $request->validate([
            'amount'        => ['required', 'numeric', 'gt:0'],
            'account_id'    => ['required', 'integer', 'exists:accounts,id'],
            'payment_date'  => ['nullable', 'date'],
            'mode'          => ['nullable', 'in:bank,cash'],
            'reference'     => ['nullable', 'string', 'max:128'],
            'notes'         => ['nullable', 'string'],
        ]);
    }

    private function companyId(): int
    {
        return app()->bound('active_company_id') ? (int) app('active_company_id') : 0;
    }

    private function resolveBankOrCash(int $companyId, string $mode): int
    {
        $key = $mode === 'cash' ? 'finance.default_cash_account_id' : 'finance.default_bank_account_id';
        $accountId = (int) ($this->settings->get($key, 0, null, $companyId) ?? 0);
        if ($accountId <= 0) {
            abort(422, "Default {$mode} account is not configured. Set {$key} in Settings.");
        }
        return $accountId;
    }

    /** Create + post a journal entry in one shot from the voucher-style payload. */
    private function buildAndPostJE(int $companyId, array $data, string $narrationBase, ?int $actorId, array $lines): \Modules\Finance\Models\JournalEntry
    {
        $narration = $narrationBase . (!empty($data['reference']) ? " (ref {$data['reference']})" : '') . (!empty($data['notes']) ? ' — ' . $data['notes'] : '');
        $je = $this->journals->create($companyId, [
            'entry_date'   => $data['payment_date'] ?? now()->toDateString(),
            'narration'    => $narration,
            'reference_no' => $data['reference'] ?? null,
        ], $lines, $actorId);
        return $this->journals->post($je, $actorId);
    }
}
