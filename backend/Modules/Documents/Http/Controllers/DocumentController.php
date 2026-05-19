<?php

namespace Modules\Documents\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Documents\Http\Requests\StoreDocumentRequest;
use Modules\Documents\Http\Resources\DocumentResource;
use Modules\Documents\Models\Document;
use Modules\Documents\Services\DocumentService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(private DocumentService $service)
    {
        $this->authorizeResource(Document::class, 'document');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return DocumentResource::collection(
            $this->service->paginate($request->only(['attachable_type', 'attachable_id', 'category', 'search', 'per_page']))
        );
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $doc = $this->service->upload(
            $companyId,
            $request->file('file'),
            $request->input('attachable_type'),
            (int) $request->input('attachable_id'),
            $request->input('category', 'other'),
            $request->input('notes'),
            $request->user()?->id
        );
        return (new DocumentResource($doc))->response()->setStatusCode(201);
    }

    public function show(Document $document): DocumentResource
    {
        return new DocumentResource($document);
    }

    public function destroy(Document $document): JsonResponse
    {
        $this->service->delete($document);
        return response()->json(['data' => ['message' => 'Document deleted.']]);
    }

    public function download(Document $document): StreamedResponse
    {
        $this->authorize('view', $document);
        return $this->service->download($document);
    }
}
