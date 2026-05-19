<?php

namespace Modules\Loans\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Loans\Http\Requests\StoreLoanRequest;
use Modules\Loans\Http\Resources\LoanResource;
use Modules\Loans\Models\Loan;
use Modules\Loans\Services\LoanService;

class LoanController extends Controller
{
    public function __construct(private LoanService $service)
    {
        $this->authorizeResource(Loan::class, 'loan');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return LoanResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'type', 'per_page']))
        );
    }

    public function store(StoreLoanRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $loan = $this->service->create($companyId, $request->validated(), $request->user()?->id);
        return (new LoanResource($loan))->response()->setStatusCode(201);
    }

    public function show(Loan $loan): LoanResource
    {
        $loan->load(['partner', 'schedule', 'payments']);
        return new LoanResource($loan);
    }

    public function update(StoreLoanRequest $request, Loan $loan): LoanResource
    {
        // Only allow editing notes, not financial fields after creation.
        $loan->fill($request->safe()->only(['notes']));
        $loan->updated_by = $request->user()?->id;
        $loan->save();
        return new LoanResource($loan->load(['partner', 'schedule', 'payments']));
    }

    public function destroy(Loan $loan): JsonResponse
    {
        if ($loan->payments()->exists()) abort(422, 'Cannot delete a loan with payments.');
        $loan->delete();
        return response()->json(['data' => ['message' => 'Loan deleted.']]);
    }

    public function recordPayment(Request $request, Loan $loan): JsonResponse
    {
        $this->authorize('payment', $loan);
        $data = $request->validate([
            'amount'       => ['required', 'numeric', 'gt:0'],
            'payment_date' => ['nullable', 'date'],
            'mode'         => ['nullable', 'string', 'max:32'],
            'bank_ref'     => ['nullable', 'string', 'max:128'],
            'emi_id'       => ['nullable', 'integer', 'exists:loan_emi_schedule,id'],
            'notes'        => ['nullable', 'string'],
        ]);
        $payment = $this->service->recordPayment($loan, $data, $request->user()?->id);
        return response()->json([
            'data' => [
                'payment_id' => $payment->id,
                'loan' => new LoanResource($loan->fresh(['partner', 'schedule', 'payments'])),
            ],
        ]);
    }

    public function cancel(Request $request, Loan $loan): LoanResource
    {
        $this->authorize('close', $loan);
        return new LoanResource($this->service->cancel($loan, $request->user()?->id)->load(['partner', 'schedule', 'payments']));
    }
}
