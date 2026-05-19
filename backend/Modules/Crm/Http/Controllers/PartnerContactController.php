<?php

namespace Modules\Crm\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Crm\Http\Requests\StorePartnerContactRequest;
use Modules\Crm\Http\Resources\PartnerContactResource;
use Modules\Crm\Models\Partner;
use Modules\Crm\Models\PartnerContact;
use Modules\Crm\Services\PartnerContactService;

class PartnerContactController extends Controller
{
    public function __construct(private PartnerContactService $contacts) {}

    public function index(Partner $partner): AnonymousResourceCollection
    {
        $this->authorize('view', $partner);
        return PartnerContactResource::collection(
            $partner->contacts()->orderByDesc('is_primary')->orderBy('name')->get()
        );
    }

    public function store(StorePartnerContactRequest $request, Partner $partner): JsonResponse
    {
        $this->authorize('update', $partner);
        $contact = $this->contacts->create($partner, $request->validated(), $request->user()?->id);
        return (new PartnerContactResource($contact))->response()->setStatusCode(201);
    }

    public function update(StorePartnerContactRequest $request, PartnerContact $contact): PartnerContactResource
    {
        $this->authorize('update', $contact->partner);
        $updated = $this->contacts->update($contact, $request->validated(), $request->user()?->id);
        return new PartnerContactResource($updated);
    }

    public function destroy(PartnerContact $contact): JsonResponse
    {
        $this->authorize('update', $contact->partner);
        $this->contacts->delete($contact);
        return response()->json(['data' => ['message' => 'Contact deleted.']]);
    }
}
