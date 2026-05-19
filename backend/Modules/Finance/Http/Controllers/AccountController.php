<?php

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Finance\Http\Requests\StoreAccountRequest;
use Modules\Finance\Http\Resources\AccountResource;
use Modules\Finance\Models\Account;

class AccountController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Account::class, 'account');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min((int) $request->input('per_page', 100), 500));
        $q = Account::query()
            ->when($request->input('type'), fn($qq, $v) => $qq->where('type', $v))
            ->when($request->input('search'), fn($qq, $v) => $qq->where(function ($qqq) use ($v) {
                $qqq->where('code', 'like', "%$v%")->orWhere('name', 'like', "%$v%");
            }))
            ->orderBy('code')
            ->paginate($perPage);
        return AccountResource::collection($q);
    }

    public function store(StoreAccountRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $a = Account::create(array_merge($request->validated(), [
            'company_id' => $companyId,
            'is_system' => false,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]));
        return (new AccountResource($a))->response()->setStatusCode(201);
    }

    public function show(Account $account): AccountResource { return new AccountResource($account); }

    public function update(StoreAccountRequest $request, Account $account): AccountResource
    {
        $account->fill($request->validated());
        $account->updated_by = $request->user()?->id;
        $account->save();
        return new AccountResource($account);
    }

    public function destroy(Account $account): JsonResponse
    {
        if ($account->is_system) abort(422, 'Cannot delete a system account.');
        $account->delete();
        return response()->json(['data' => ['message' => 'Account deleted.']]);
    }
}
