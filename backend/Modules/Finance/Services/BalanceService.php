<?php

namespace Modules\Finance\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Finance\Models\Account;
use Modules\Finance\Models\AccountBalance;
use Modules\Finance\Models\JournalEntry;
use Modules\Finance\Models\JournalLine;

class BalanceService
{
    /**
     * Recompute and upsert account_balances rows for a list of accounts as of a given date.
     * Inclusive of all posted (non-cancelled) entries up to and including $asOf.
     */
    public function recompute(int $companyId, array $accountIds, $asOf): void
    {
        $asOf = Carbon::parse($asOf)->toDateString();
        foreach ($accountIds as $accountId) {
            $totals = JournalLine::query()
                ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
                ->where('journal_entries.company_id', $companyId)
                ->where('journal_entries.status', JournalEntry::STATUS_POSTED)
                ->where('journal_entries.entry_date', '<=', $asOf)
                ->where('journal_lines.account_id', $accountId)
                ->selectRaw('SUM(journal_lines.debit) AS d, SUM(journal_lines.credit) AS c')
                ->first();

            $debit  = (float) ($totals?->d ?? 0);
            $credit = (float) ($totals?->c ?? 0);
            $signed = $this->signedBalance($accountId, $debit, $credit);

            AccountBalance::updateOrCreate(
                ['account_id' => $accountId, 'as_of' => $asOf],
                ['company_id' => $companyId, 'debit_total' => $debit, 'credit_total' => $credit, 'balance' => $signed]
            );
        }
    }

    /**
     * Trial balance for a date range (or as_of single date).
     * Returns rows: { account_id, code, name, type, opening, debit, credit, closing }.
     */
    public function trialBalance(int $companyId, string $from, string $to): array
    {
        $accounts = Account::where('company_id', $companyId)->where('is_group', false)->orderBy('code')->get();
        $rows = [];
        foreach ($accounts as $a) {
            $opening = $this->balanceAt($companyId, $a->id, Carbon::parse($from)->subDay()->toDateString());
            $period = JournalLine::query()
                ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
                ->where('journal_entries.company_id', $companyId)
                ->where('journal_entries.status', JournalEntry::STATUS_POSTED)
                ->whereBetween('journal_entries.entry_date', [$from, $to])
                ->where('journal_lines.account_id', $a->id)
                ->selectRaw('SUM(journal_lines.debit) AS d, SUM(journal_lines.credit) AS c')
                ->first();
            $debit = (float) ($period?->d ?? 0);
            $credit = (float) ($period?->c ?? 0);
            $closing = $this->balanceAt($companyId, $a->id, $to);

            if ($opening == 0 && $debit == 0 && $credit == 0 && $closing == 0) continue;

            $rows[] = [
                'account_id' => $a->id, 'code' => $a->code, 'name' => $a->name, 'type' => $a->type,
                'opening' => round($opening, 2),
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'closing' => round($closing, 2),
            ];
        }
        return $rows;
    }

    /**
     * Ledger entries for a single account between dates.
     */
    public function ledger(int $companyId, int $accountId, string $from, string $to): array
    {
        $opening = $this->balanceAt($companyId, $accountId, Carbon::parse($from)->subDay()->toDateString());
        $rows = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', JournalEntry::STATUS_POSTED)
            ->whereBetween('journal_entries.entry_date', [$from, $to])
            ->where('journal_lines.account_id', $accountId)
            ->orderBy('journal_entries.entry_date')->orderBy('journal_entries.id')
            ->select('journal_lines.*', 'journal_entries.code as entry_code', 'journal_entries.entry_date', 'journal_entries.reference_type', 'journal_entries.reference_id', 'journal_entries.reference_no')
            ->get();

        $running = $opening;
        $sign = $this->signFor($accountId);
        $out = [];
        foreach ($rows as $r) {
            $delta = $sign * ((float) $r->debit - (float) $r->credit);
            $running = $running + $delta;
            $out[] = [
                'entry_id' => $r->journal_entry_id,
                'entry_code' => $r->entry_code,
                'entry_date' => Carbon::parse($r->entry_date)->toDateString(),
                'reference_type' => $r->reference_type,
                'reference_id' => $r->reference_id,
                'reference_no' => $r->reference_no,
                'narration' => $r->narration,
                'debit' => (float) $r->debit,
                'credit' => (float) $r->credit,
                'balance' => round($running, 2),
            ];
        }
        return [
            'opening' => round($opening, 2),
            'closing' => round($running, 2),
            'rows' => $out,
        ];
    }

    /**
     * P&L: sum income - sum expense over a date range.
     */
    public function profitAndLoss(int $companyId, string $from, string $to): array
    {
        return $this->summaryByType($companyId, $from, $to);
    }

    /**
     * Balance sheet: assets vs (liabilities + equity) as of date.
     */
    public function balanceSheet(int $companyId, string $asOf): array
    {
        $assets = $this->byType($companyId, 'asset',     null, $asOf);
        $liab   = $this->byType($companyId, 'liability', null, $asOf);
        $equity = $this->byType($companyId, 'equity',    null, $asOf);
        return [
            'as_of' => $asOf,
            'assets' => $assets,
            'liabilities' => $liab,
            'equity' => $equity,
            'totals' => [
                'assets'      => array_sum(array_column($assets, 'balance')),
                'liabilities' => array_sum(array_column($liab, 'balance')),
                'equity'      => array_sum(array_column($equity, 'balance')),
            ],
        ];
    }

    private function summaryByType(int $companyId, string $from, string $to): array
    {
        $income  = $this->byType($companyId, 'income',  $from, $to);
        $expense = $this->byType($companyId, 'expense', $from, $to);
        $totalIncome  = array_sum(array_column($income,  'balance'));
        $totalExpense = array_sum(array_column($expense, 'balance'));
        return [
            'from' => $from, 'to' => $to,
            'income'  => $income,
            'expense' => $expense,
            'totals'  => [
                'income'  => $totalIncome,
                'expense' => $totalExpense,
                'profit'  => round($totalIncome - $totalExpense, 2),
            ],
        ];
    }

    private function byType(int $companyId, string $type, ?string $from, string $to): array
    {
        $accounts = Account::where('company_id', $companyId)->where('type', $type)->where('is_group', false)->orderBy('code')->get();
        $rows = [];
        foreach ($accounts as $a) {
            if ($from === null) {
                $bal = $this->balanceAt($companyId, $a->id, $to);
            } else {
                $period = JournalLine::query()
                    ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
                    ->where('journal_entries.company_id', $companyId)
                    ->where('journal_entries.status', JournalEntry::STATUS_POSTED)
                    ->whereBetween('journal_entries.entry_date', [$from, $to])
                    ->where('journal_lines.account_id', $a->id)
                    ->selectRaw('SUM(journal_lines.debit) AS d, SUM(journal_lines.credit) AS c')
                    ->first();
                $debit = (float) ($period?->d ?? 0);
                $credit = (float) ($period?->c ?? 0);
                $bal = $this->signFor($a->id) * ($debit - $credit);
            }
            if ($bal == 0) continue;
            $rows[] = ['account_id' => $a->id, 'code' => $a->code, 'name' => $a->name, 'balance' => round($bal, 2)];
        }
        return $rows;
    }

    public function balanceAt(int $companyId, int $accountId, string $asOf): float
    {
        $period = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', JournalEntry::STATUS_POSTED)
            ->where('journal_entries.entry_date', '<=', $asOf)
            ->where('journal_lines.account_id', $accountId)
            ->selectRaw('SUM(journal_lines.debit) AS d, SUM(journal_lines.credit) AS c')
            ->first();
        $debit = (float) ($period?->d ?? 0);
        $credit = (float) ($period?->c ?? 0);
        return $this->signFor($accountId) * ($debit - $credit);
    }

    private function signFor(int $accountId): int
    {
        $a = Account::find($accountId);
        return $a?->naturalSign() ?? 1;
    }

    private function signedBalance(int $accountId, float $debit, float $credit): float
    {
        return $this->signFor($accountId) * ($debit - $credit);
    }
}
