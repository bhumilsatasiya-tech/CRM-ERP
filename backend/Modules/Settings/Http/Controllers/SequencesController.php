<?php

namespace Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Settings\Http\Requests\StoreSequenceRequest;
use Modules\Settings\Http\Requests\UpdateSequenceRequest;
use Modules\Settings\Http\Resources\SequenceResource;
use Modules\Settings\Models\Sequence;
use Modules\Settings\Services\SequenceService;

class SequencesController extends Controller
{
    public function __construct(private SequenceService $sequences)
    {
        $this->authorizeResource(Sequence::class, 'sequence');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = Sequence::query()
            ->when($request->filled('company_id'), fn($q) => $q->where('company_id', $request->integer('company_id')))
            ->when($request->filled('search'), fn($q) => $q->where(function ($qq) use ($request) {
                $term = '%'.$request->string('search').'%';
                $qq->where('doc_type', 'like', $term)->orWhere('name', 'like', $term);
            }))
            ->orderBy('company_id')->orderBy('doc_type')
            ->get();

        // Inject preview-next on each row (without consuming the counter)
        $rows->each(function ($s) {
            $s->next_preview = $this->sequences->previewNext($s);
        });

        return SequenceResource::collection($rows);
    }

    public function store(StoreSequenceRequest $request): JsonResponse
    {
        $seq = Sequence::create(array_merge($request->validated(), [
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
            'is_active'  => $request->validated()['is_active'] ?? true,
        ]));
        return (new SequenceResource($seq))->response()->setStatusCode(201);
    }

    public function show(Sequence $sequence): SequenceResource
    {
        $sequence->next_preview = $this->sequences->previewNext($sequence);
        return new SequenceResource($sequence);
    }

    public function update(UpdateSequenceRequest $request, Sequence $sequence): SequenceResource
    {
        $sequence->fill($request->validated());
        $sequence->updated_by = $request->user()?->id;
        $sequence->save();
        $sequence->refresh();
        $sequence->next_preview = $this->sequences->previewNext($sequence);
        return new SequenceResource($sequence);
    }

    public function destroy(Sequence $sequence): JsonResponse
    {
        $sequence->delete();
        return response()->json(['data' => ['message' => 'Sequence deleted.']]);
    }

    public function previewNext(Sequence $sequence): JsonResponse
    {
        $this->authorize('view', $sequence);
        return response()->json([
            'data' => [
                'doc_type'     => $sequence->doc_type,
                'next_preview' => $this->sequences->previewNext($sequence),
            ],
        ]);
    }

    /**
     * Preview the next code for the active company's sequence of a given doc_type.
     * Used by every "new doc" form to show the auto-generated number to the user.
     */
    public function previewByDocType(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('sequence.view'), 403, 'Forbidden');
        $docType = (string) $request->input('doc_type', '');
        if ($docType === '') abort(422, 'doc_type is required.');

        $companyId = $request->integer('company_id') ?: (app()->bound('active_company_id') ? (int) app('active_company_id') : 0);
        if (!$companyId) abort(422, 'No active company.');

        $preview = $this->sequences->previewByDocType($companyId, $docType);
        return response()->json([
            'data' => [
                'company_id'   => $companyId,
                'doc_type'     => $docType,
                'next_preview' => $preview,
            ],
        ]);
    }
}
