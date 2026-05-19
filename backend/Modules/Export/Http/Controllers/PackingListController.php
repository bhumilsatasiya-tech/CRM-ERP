<?php

namespace Modules\Export\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Export\Http\Requests\StorePackingListRequest;
use Modules\Export\Http\Resources\PackingListResource;
use Modules\Export\Models\PackingList;
use Modules\Export\Services\PackingListService;

class PackingListController extends Controller
{
    public function __construct(private PackingListService $service)
    {
        $this->authorizeResource(PackingList::class, 'packingList');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return PackingListResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'export_invoice_id', 'per_page']))
        );
    }

    public function store(StorePackingListRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $pl = $this->service->create($companyId, $this->headerFromRequest($data), $data['lines'], $request->user()?->id);
        return (new PackingListResource($pl))->response()->setStatusCode(201);
    }

    public function show(PackingList $packingList): PackingListResource
    {
        $packingList->load(['items.product', 'exportInvoice', 'partner', 'consignee']);
        return new PackingListResource($packingList);
    }

    public function update(StorePackingListRequest $request, PackingList $packingList): PackingListResource
    {
        $data = $request->validated();
        $updated = $this->service->update($packingList, $this->headerFromRequest($data), $data['lines'] ?? null, $request->user()?->id);
        return new PackingListResource($updated->load(['items.product', 'exportInvoice', 'partner', 'consignee']));
    }

    private function headerFromRequest(array $data): array
    {
        return [
            'code'                      => $data['code'] ?? null,
            'export_invoice_id'         => $data['export_invoice_id'],
            'partner_id'                => $data['partner_id'] ?? null,
            'pl_date'                   => $data['pl_date'],
            'invoice_date'              => $data['invoice_date'] ?? null,
            'date_of_supply'            => $data['date_of_supply'] ?? null,
            'transport_mode'            => $data['transport_mode'] ?? null,
            'incoterm'                  => $data['incoterm'] ?? null,
            'lut_no'                    => $data['lut_no'] ?? null,
            'lut_date'                  => $data['lut_date'] ?? null,
            'tax_details'               => $data['tax_details'] ?? null,
            'place_of_supply'           => $data['place_of_supply'] ?? null,
            'consignee_partner_id'      => $data['consignee_partner_id'] ?? null,
            'consignee_name'            => $data['consignee_name'] ?? null,
            'consignee_address'         => $data['consignee_address'] ?? null,
            'consignee_country'         => $data['consignee_country'] ?? null,
            'consignee_contact_person'  => $data['consignee_contact_person'] ?? null,
            'consignee_phone'           => $data['consignee_phone'] ?? null,
            'consignee_email'           => $data['consignee_email'] ?? null,
            'consignee_registration_no' => $data['consignee_registration_no'] ?? null,
            'notify_party_name'         => $data['notify_party_name'] ?? null,
            'notify_party_address'      => $data['notify_party_address'] ?? null,
            'port_of_loading'           => $data['port_of_loading'] ?? null,
            'port_of_discharge'         => $data['port_of_discharge'] ?? null,
            'loading_destination'       => $data['loading_destination'] ?? null,
            'final_destination'         => $data['final_destination'] ?? null,
            'marks_and_numbers'         => $data['marks_and_numbers'] ?? null,
            'total_pallet_qty'          => $data['total_pallet_qty'] ?? 0,
            'volume_cbm'                => $data['volume_cbm'] ?? 0,
            'notes'                     => $data['notes'] ?? null,
        ];
    }

    public function destroy(PackingList $packingList): JsonResponse
    {
        $this->service->delete($packingList);
        return response()->json(['data' => ['message' => 'Packing list deleted.']]);
    }

    public function finalize(Request $request, PackingList $packingList): PackingListResource
    {
        $this->authorize('finalize', $packingList);
        return new PackingListResource($this->service->finalize($packingList, $request->user()?->id)->load(['items.product', 'exportInvoice', 'partner', 'consignee']));
    }

    public function cancel(Request $request, PackingList $packingList): PackingListResource
    {
        $this->authorize('finalize', $packingList);
        return new PackingListResource($this->service->cancel($packingList, $request->input('reason'), $request->user()?->id)->load(['items.product', 'exportInvoice', 'partner', 'consignee']));
    }
}
