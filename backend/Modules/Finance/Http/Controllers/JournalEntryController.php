<?php

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Finance\Http\Requests\StoreJournalEntryRequest;
use Modules\Finance\Http\Resources\JournalEntryResource;
use Modules\Finance\Models\JournalEntry;
use Modules\Finance\Services\JournalService;

class JournalEntryController extends Controller
{
    public function __construct(private JournalService $service)
    {
        $this->authorizeResource(JournalEntry::class, 'entry');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return JournalEntryResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'reference_type', 'from', 'to', 'per_page']))
        );
    }

    public function store(StoreJournalEntryRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $je = $this->service->create($companyId, [
            'code'         => $data['code'] ?? null,
            'entry_date'   => $data['entry_date'],
            'narration'    => $data['narration'] ?? null,
            'reference_no' => $data['reference_no'] ?? null,
        ], $data['lines'], $request->user()?->id);
        return (new JournalEntryResource($je))->response()->setStatusCode(201);
    }

    public function show(JournalEntry $entry): JournalEntryResource
    {
        $entry->load(['lines.account']);
        return new JournalEntryResource($entry);
    }

    public function update(StoreJournalEntryRequest $request, JournalEntry $entry): JournalEntryResource
    {
        $data = $request->validated();
        $updated = $this->service->update($entry, $data, $data['lines'] ?? null, $request->user()?->id);
        return new JournalEntryResource($updated);
    }

    public function destroy(JournalEntry $entry): JsonResponse
    {
        $this->service->delete($entry);
        return response()->json(['data' => ['message' => 'Journal entry deleted.']]);
    }

    public function post(Request $request, JournalEntry $entry): JournalEntryResource
    {
        $this->authorize('post', $entry);
        $updated = $this->service->post($entry, $request->user()?->id);
        return new JournalEntryResource($updated->load(['lines.account']));
    }

    public function cancel(Request $request, JournalEntry $entry): JournalEntryResource
    {
        $this->authorize('cancel', $entry);
        $updated = $this->service->cancel($entry, $request->input('reason'), $request->user()?->id);
        return new JournalEntryResource($updated->load(['lines.account']));
    }
}
