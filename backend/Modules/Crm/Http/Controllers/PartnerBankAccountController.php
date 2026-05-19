<?php

namespace Modules\Crm\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Crm\Http\Requests\StorePartnerBankAccountRequest;
use Modules\Crm\Http\Resources\PartnerBankAccountResource;
use Modules\Crm\Models\Partner;
use Modules\Crm\Models\PartnerBankAccount;
use Modules\Crm\Services\PartnerBankAccountService;

class PartnerBankAccountController extends Controller
{
    public function __construct(private PartnerBankAccountService $banks) {}

    public function index(Partner $partner): AnonymousResourceCollection
    {
        $this->authorize('view', $partner);
        return PartnerBankAccountResource::collection(
            $partner->bankAccounts()->orderByDesc('is_primary')->orderBy('bank_name')->get()
        );
    }

    public function store(StorePartnerBankAccountRequest $request, Partner $partner): JsonResponse
    {
        $this->authorize('update', $partner);
        $bank = $this->banks->create($partner, $request->validated(), $request->user()?->id);
        return (new PartnerBankAccountResource($bank))->response()->setStatusCode(201);
    }

    public function update(StorePartnerBankAccountRequest $request, PartnerBankAccount $bank): PartnerBankAccountResource
    {
        $this->authorize('update', $bank->partner);
        $updated = $this->banks->update($bank, $request->validated(), $request->user()?->id);
        return new PartnerBankAccountResource($updated);
    }

    public function destroy(PartnerBankAccount $bank): JsonResponse
    {
        $this->authorize('update', $bank->partner);
        $this->banks->delete($bank);
        return response()->json(['data' => ['message' => 'Bank account deleted.']]);
    }
}
