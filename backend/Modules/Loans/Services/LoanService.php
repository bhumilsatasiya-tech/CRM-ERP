<?php

namespace Modules\Loans\Services;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Loans\Events\LoanPaymentReceived;
use Modules\Loans\Models\Loan;
use Modules\Loans\Models\LoanEmi;
use Modules\Loans\Models\LoanPayment;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class LoanService
{
    public function __construct(private SequenceService $sequences) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Loan::query()
            ->with(['partner:id,code,name'])
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(($filters['type']   ?? '') !== '', fn(Builder $q) => $q->where('type', $filters['type']))
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $data, ?int $actorId = null): Loan
    {
        return DB::transaction(function () use ($companyId, $data, $actorId) {
            $code = $this->sequences->next($companyId, 'loan', $data['code'] ?? null);
            $principal  = (float) $data['principal'];
            $rate       = (float) ($data['interest_rate_pct'] ?? 0);
            $tenure     = (int) $data['tenure_months'];
            $start      = Carbon::parse($data['start_date']);

            // EMI (reducing balance) — equated monthly installment
            $monthlyRate = $rate > 0 ? ($rate / 12 / 100) : 0;
            $emi = $monthlyRate > 0
                ? round($principal * $monthlyRate * (($monthlyRate + 1) ** $tenure) / ((($monthlyRate + 1) ** $tenure) - 1), 2)
                : round($principal / $tenure, 2);
            $totalPayable  = round($emi * $tenure, 2);
            $totalInterest = round($totalPayable - $principal, 2);

            $loan = Loan::create(array_merge($data, [
                'company_id' => $companyId,
                'code'       => $code,
                'emi_amount' => $emi,
                'total_payable'  => $totalPayable,
                'total_interest' => $totalInterest,
                'outstanding_principal' => $principal,
                'status'     => Loan::STATUS_ACTIVE,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));

            // Generate schedule
            $remaining = $principal;
            for ($i = 1; $i <= $tenure; $i++) {
                $interest = round($remaining * $monthlyRate, 2);
                $principalPart = $i === $tenure ? round($remaining, 2) : round($emi - $interest, 2);
                $emiAmt = round($principalPart + $interest, 2);
                LoanEmi::create([
                    'loan_id' => $loan->id,
                    'installment_no' => $i,
                    'due_date' => $start->copy()->addMonthsNoOverflow($i)->toDateString(),
                    'principal_component' => $principalPart,
                    'interest_component'  => $interest,
                    'emi_amount' => $emiAmt,
                    'paid_amount' => 0,
                    'status' => LoanEmi::STATUS_PENDING,
                ]);
                $remaining = round($remaining - $principalPart, 2);
            }
            return $loan->fresh(['schedule', 'partner']);
        });
    }

    public function recordPayment(Loan $loan, array $data, ?int $actorId = null): LoanPayment
    {
        if ($loan->status !== Loan::STATUS_ACTIVE) {
            throw new RuntimeException('Can only record payments against an active loan.');
        }
        $amount = (float) $data['amount'];
        if ($amount <= 0) throw new RuntimeException('Amount must be positive.');

        return DB::transaction(function () use ($loan, $data, $amount, $actorId) {
            $payment = LoanPayment::create([
                'loan_id'      => $loan->id,
                'emi_id'       => $data['emi_id'] ?? null,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount'       => $amount,
                'mode'         => $data['mode'] ?? 'bank',
                'bank_ref'     => $data['bank_ref'] ?? null,
                'notes'        => $data['notes'] ?? null,
                'created_by'   => $actorId,
            ]);

            // Waterfall: apply across pending+overdue EMIs in due_date order.
            $remaining = $amount;
            $emis = $loan->schedule()->whereIn('status', [LoanEmi::STATUS_PENDING, LoanEmi::STATUS_PARTIAL, LoanEmi::STATUS_OVERDUE])
                ->orderBy('due_date')->orderBy('installment_no')->get();

            $principalPaid = 0;
            foreach ($emis as $emi) {
                if ($remaining <= 0) break;
                $owed = (float) $emi->emi_amount - (float) $emi->paid_amount;
                $apply = min($remaining, $owed);
                $emi->paid_amount = round((float) $emi->paid_amount + $apply, 2);
                $emi->status = $emi->paid_amount >= (float) $emi->emi_amount - 0.01
                    ? LoanEmi::STATUS_PAID
                    : LoanEmi::STATUS_PARTIAL;
                $emi->save();
                // Track principal repaid (proportional to principal_component / emi_amount of THIS emi)
                $principalPaid += round($apply * ((float) $emi->principal_component / (float) $emi->emi_amount), 2);
                $remaining = round($remaining - $apply, 2);
            }

            $loan->outstanding_principal = max(0, round((float) $loan->outstanding_principal - $principalPaid, 2));
            if ($loan->outstanding_principal <= 0.01) {
                $loan->status = Loan::STATUS_CLOSED;
                $loan->outstanding_principal = 0;
            }
            $loan->updated_by = $actorId;
            $loan->save();

            event(new LoanPaymentReceived($payment->fresh(['loan'])));
            return $payment;
        });
    }

    public function cancel(Loan $loan, ?int $actorId = null): Loan
    {
        if ($loan->payments()->exists()) throw new RuntimeException('Cannot cancel a loan with payments. Reverse payments first.');
        $loan->status = Loan::STATUS_CANCELLED;
        $loan->updated_by = $actorId;
        $loan->save();
        return $loan;
    }
}
