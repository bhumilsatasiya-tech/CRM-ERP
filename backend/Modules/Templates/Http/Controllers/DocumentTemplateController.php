<?php

namespace Modules\Templates\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Templates\Http\Requests\StoreDocumentTemplateRequest;
use Modules\Templates\Http\Resources\DocumentTemplateResource;
use Modules\Templates\Models\DocumentTemplate;
use Modules\Templates\Services\TemplateContextBuilder;
use Modules\Templates\Services\TemplateService;

class DocumentTemplateController extends Controller
{
    public function __construct(
        private TemplateService $service,
        private TemplateContextBuilder $context,
    ) {
        $this->authorizeResource(DocumentTemplate::class, 'template');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = DocumentTemplate::query()
            ->when($request->filled('company_id'), fn($q) => $q->where('company_id', $request->integer('company_id')))
            ->when($request->filled('doc_type'),   fn($q) => $q->where('doc_type', $request->string('doc_type')))
            ->orderBy('company_id')->orderBy('doc_type')->orderByDesc('is_default')
            ->get();
        return DocumentTemplateResource::collection($rows);
    }

    public function store(StoreDocumentTemplateRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? (int) app('active_company_id') : 0;
        $tpl = DocumentTemplate::create(array_merge($request->validated(), [
            'company_id' => $companyId,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]));
        if (!empty($request->validated()['is_default'])) $this->service->makeDefault($tpl);
        return (new DocumentTemplateResource($tpl->fresh()))->response()->setStatusCode(201);
    }

    public function show(DocumentTemplate $template): DocumentTemplateResource
    {
        return new DocumentTemplateResource($template);
    }

    public function update(StoreDocumentTemplateRequest $request, DocumentTemplate $template): DocumentTemplateResource
    {
        $template->fill($request->validated());
        $template->updated_by = $request->user()?->id;
        $template->save();
        if (!empty($request->validated()['is_default'])) $this->service->makeDefault($template);
        return new DocumentTemplateResource($template->fresh());
    }

    public function destroy(DocumentTemplate $template): JsonResponse
    {
        $template->delete();
        return response()->json(['data' => ['message' => 'Template deleted.']]);
    }

    /** Render the template against MOCK data — used by the editor preview. Returns rendered HTML. */
    public function preview(DocumentTemplate $template): JsonResponse
    {
        $this->authorize('view', $template);
        $mock = $this->context->mockContextFor($template->doc_type);
        $html = $this->service->renderWithContext($template, $mock);
        return response()->json(['data' => ['html' => $html]]);
    }

    /** Make this template the default for its (company, doc_type). */
    public function makeDefault(DocumentTemplate $template): DocumentTemplateResource
    {
        $this->authorize('update', $template);
        return new DocumentTemplateResource($this->service->makeDefault($template));
    }
}
