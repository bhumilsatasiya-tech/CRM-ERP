<?php

namespace Modules\Crm\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Crm\Http\Requests\StorePartnerAddressRequest;
use Modules\Crm\Http\Resources\PartnerAddressResource;
use Modules\Crm\Models\Partner;
use Modules\Crm\Models\PartnerAddress;
use Modules\Crm\Services\PartnerAddressService;

class PartnerAddressController extends Controller
{
    public function __construct(private PartnerAddressService $addresses) {}

    public function index(Partner $partner): AnonymousResourceCollection
    {
        $this->authorize('view', $partner);
        return PartnerAddressResource::collection(
            $partner->addresses()->orderBy('type')->orderByDesc('is_primary')->get()
        );
    }

    public function store(StorePartnerAddressRequest $request, Partner $partner): JsonResponse
    {
        $this->authorize('update', $partner);
        $address = $this->addresses->create($partner, $request->validated(), $request->user()?->id);
        return (new PartnerAddressResource($address))->response()->setStatusCode(201);
    }

    public function update(StorePartnerAddressRequest $request, PartnerAddress $address): PartnerAddressResource
    {
        $this->authorize('update', $address->partner);
        $updated = $this->addresses->update($address, $request->validated(), $request->user()?->id);
        return new PartnerAddressResource($updated);
    }

    public function destroy(PartnerAddress $address): JsonResponse
    {
        $this->authorize('update', $address->partner);
        $this->addresses->delete($address);
        return response()->json(['data' => ['message' => 'Address deleted.']]);
    }
}
