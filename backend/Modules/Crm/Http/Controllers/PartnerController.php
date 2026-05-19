<?php

namespace Modules\Crm\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Crm\Http\Requests\StorePartnerRequest;
use Modules\Crm\Http\Requests\UpdatePartnerRequest;
use Modules\Crm\Http\Resources\PartnerResource;
use Modules\Crm\Models\Partner;
use Modules\Crm\Services\PartnerService;

class PartnerController extends Controller
{
    public function __construct(private PartnerService $partners)
    {
        $this->authorizeResource(Partner::class, 'partner');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $page = $this->partners->paginate(
            $request->only(['search', 'type', 'segment', 'is_active', 'sort', 'per_page'])
        );
        return PartnerResource::collection($page);
    }

    public function store(StorePartnerRequest $request): JsonResponse
    {
        $partner = $this->partners->create($request->validated(), $request->user()?->id);
        return (new PartnerResource($partner))->response()->setStatusCode(201);
    }

    public function show(Partner $partner): PartnerResource
    {
        $partner->load(['contacts', 'addresses', 'bankAccounts']);
        $partner->loadCount(['contacts', 'addresses', 'bankAccounts']);
        return new PartnerResource($partner);
    }

    public function update(UpdatePartnerRequest $request, Partner $partner): PartnerResource
    {
        $updated = $this->partners->update($partner, $request->validated(), $request->user()?->id);
        return new PartnerResource($updated->fresh()->load(['contacts', 'addresses', 'bankAccounts']));
    }

    public function destroy(Partner $partner): JsonResponse
    {
        $this->partners->delete($partner);
        return response()->json(['data' => ['message' => 'Partner deleted.']]);
    }
}
