<?php

namespace Modules\Hr\Services;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Hr\Events\SalaryRunPosted;
use Modules\Hr\Models\Employee;
use Modules\Hr\Models\Payslip;
use Modules\Hr\Models\SalaryComponent;
use Modules\Hr\Models\SalaryRun;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

class PayrollService
{
    public function __construct(private SequenceService $sequences) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return SalaryRun::query()
            ->withCount('payslips')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('code', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->orderByDesc('period_end')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function prepareRun(int $companyId, string $period, ?int $actorId = null): SalaryRun
    {
        return DB::transaction(function () use ($companyId, $period, $actorId) {
            $start = Carbon::parse($period . '-01')->startOfMonth();
            $end   = $start->copy()->endOfMonth();

            $code = $this->sequences->next($companyId, 'salary_run');
            $run = SalaryRun::create([
                'company_id'   => $companyId, 'code' => $code,
                'period'       => $start->format('Y-m'),
                'period_start' => $start->toDateString(),
                'period_end'   => $end->toDateString(),
                'status'       => SalaryRun::STATUS_DRAFT,
                'created_by'   => $actorId, 'updated_by' => $actorId,
            ]);

            // For each active employee with a structure on or before period_end, build a payslip.
            $employees = Employee::where('company_id', $companyId)
                ->where('status', Employee::STATUS_ACTIVE)
                ->with(['structures' => fn($q) => $q->where('effective_from', '<=', $end->toDateString())])
                ->get();

            foreach ($employees as $emp) {
                $struct = $emp->structures->first();
                if (! $struct) continue;
                $payslip = $this->buildPayslip($struct->basic, $struct->components ?? []);
                Payslip::create([
                    'salary_run_id'    => $run->id,
                    'employee_id'      => $emp->id,
                    'breakdown'        => $payslip,
                    'gross'            => $payslip['gross'],
                    'total_deductions' => $payslip['total_deductions'],
                    'net_pay'          => $payslip['net_pay'],
                ]);
            }

            return $run->fresh(['payslips.employee']);
        });
    }

    public function recompute(SalaryRun $run): SalaryRun
    {
        if (! $run->isEditable()) throw new RuntimeException('Only draft runs can be recomputed.');
        return DB::transaction(function () use ($run) {
            foreach ($run->payslips as $p) {
                $struct = $p->employee->latestStructure();
                if (! $struct) continue;
                $b = $this->buildPayslip($struct->basic, $struct->components ?? []);
                $p->forceFill([
                    'breakdown' => $b,
                    'gross' => $b['gross'],
                    'total_deductions' => $b['total_deductions'],
                    'net_pay' => $b['net_pay'],
                ])->save();
            }
            return $run->fresh(['payslips.employee']);
        });
    }

    public function post(SalaryRun $run, ?int $actorId = null): SalaryRun
    {
        if ($run->status !== SalaryRun::STATUS_DRAFT) throw new RuntimeException('Only draft runs can be posted.');
        if (! $run->payslips()->exists()) throw new RuntimeException('Cannot post a run with no payslips.');

        return DB::transaction(function () use ($run, $actorId) {
            $run->forceFill([
                'status' => SalaryRun::STATUS_POSTED,
                'posted_at' => now(),
                'posted_by' => $actorId,
                'updated_by' => $actorId,
            ])->save();
            event(new SalaryRunPosted($run->fresh(['payslips'])));
            return $run->fresh(['payslips.employee']);
        });
    }

    public function cancel(SalaryRun $run, ?string $reason = null, ?int $actorId = null): SalaryRun
    {
        if ($run->status === SalaryRun::STATUS_CANCELLED) throw new RuntimeException('Already cancelled.');
        $run->forceFill([
            'status' => SalaryRun::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => $actorId,
            'cancellation_reason' => $reason,
            'updated_by' => $actorId,
        ])->save();
        return $run;
    }

    public function delete(SalaryRun $run): void
    {
        if (! $run->isEditable()) throw new RuntimeException('Only draft runs can be deleted.');
        DB::transaction(fn() => $run->delete());
    }

    public function markPaid(Payslip $p, string $paymentRef, ?Carbon $paidAt = null): Payslip
    {
        $p->forceFill(['paid_at' => $paidAt ?? now(), 'payment_ref' => $paymentRef])->save();
        return $p;
    }

    /**
     * Build payslip breakdown from basic + components snapshot.
     * components: [['code', 'name', 'type', 'formula_type', 'formula_value']]
     */
    public function buildPayslip(float $basic, array $components): array
    {
        $earnings = ['Basic' => round($basic, 2)];
        $deductions = [];
        foreach ($components as $c) {
            $value = (float) ($c['formula_value'] ?? 0);
            $type  = $c['formula_type'] ?? 'fixed';
            $amt   = $type === 'percent_of_basic' ? round($basic * $value / 100, 2) : round($value, 2);
            if (($c['type'] ?? 'earning') === 'earning') {
                $earnings[$c['name'] ?? $c['code'] ?? 'Earning'] = $amt;
            } else {
                $deductions[$c['name'] ?? $c['code'] ?? 'Deduction'] = $amt;
            }
        }
        $gross = round(array_sum($earnings), 2);
        $totalDed = round(array_sum($deductions), 2);
        return [
            'earnings'         => $earnings,
            'deductions'       => $deductions,
            'gross'            => $gross,
            'total_deductions' => $totalDed,
            'net_pay'          => round($gross - $totalDed, 2),
        ];
    }

    /**
     * Helper: take a list of SalaryComponent models from CoA and return them in
     * the structure-snapshot format used by employee_salary_structures.components.
     */
    public function snapshotComponents($components): array
    {
        return collect($components)->map(fn(SalaryComponent $c) => [
            'code' => $c->code, 'name' => $c->name, 'type' => $c->type,
            'formula_type' => $c->formula_type, 'formula_value' => (float) $c->formula_value,
        ])->values()->all();
    }
}
