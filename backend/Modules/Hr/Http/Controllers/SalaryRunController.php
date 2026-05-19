<?php

namespace Modules\Hr\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Hr\Http\Resources\SalaryRunResource;
use Modules\Hr\Models\Payslip;
use Modules\Hr\Models\SalaryRun;
use Modules\Hr\Services\PayrollService;

class SalaryRunController extends Controller
{
    public function __construct(private PayrollService $service)
    {
        $this->authorizeResource(SalaryRun::class, 'run');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return SalaryRunResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'per_page']))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $period = (string) $request->validate(['period' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/']])['period'];
        $run = $this->service->prepareRun($companyId, $period, $request->user()?->id);
        return (new SalaryRunResource($run))->response()->setStatusCode(201);
    }

    public function show(SalaryRun $run): SalaryRunResource
    {
        $run->load(['payslips.employee']);
        return new SalaryRunResource($run);
    }

    public function update(Request $request, SalaryRun $run): SalaryRunResource
    {
        $updated = $this->service->recompute($run);
        return new SalaryRunResource($updated);
    }

    public function destroy(SalaryRun $run): JsonResponse
    {
        $this->service->delete($run);
        return response()->json(['data' => ['message' => 'Salary run deleted.']]);
    }

    public function post(Request $request, SalaryRun $run): SalaryRunResource
    {
        $this->authorize('post', $run);
        return new SalaryRunResource($this->service->post($run, $request->user()?->id)->load(['payslips.employee']));
    }

    public function cancel(Request $request, SalaryRun $run): SalaryRunResource
    {
        $this->authorize('cancel', $run);
        return new SalaryRunResource($this->service->cancel($run, $request->input('reason'), $request->user()?->id)->load(['payslips.employee']));
    }

    public function markPaid(Request $request, SalaryRun $run, Payslip $payslip): JsonResponse
    {
        $this->authorize('markPaid', $run);
        if ($payslip->salary_run_id !== $run->id) abort(404);
        $data = $request->validate(['payment_ref' => ['required', 'string']]);
        $this->service->markPaid($payslip, $data['payment_ref']);
        $run->refresh()->load(['payslips.employee']);
        return response()->json(['data' => new SalaryRunResource($run)]);
    }
}
