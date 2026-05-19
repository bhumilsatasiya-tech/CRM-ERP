<?php

namespace Modules\Projects\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Projects\Http\Requests\StoreCostEntryRequest;
use Modules\Projects\Http\Requests\StoreProjectRequest;
use Modules\Projects\Http\Resources\ProjectCostEntryResource;
use Modules\Projects\Http\Resources\ProjectResource;
use Modules\Projects\Models\Project;
use Modules\Projects\Models\ProjectCostEntry;
use Modules\Projects\Services\ProjectCostingService;

class ProjectController extends Controller
{
    public function __construct(private ProjectCostingService $service)
    {
        $this->authorizeResource(Project::class, 'project');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return ProjectResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'per_page']))
        );
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $project = $this->service->create($companyId, $request->validated(), $request->user()?->id);
        return (new ProjectResource($project->load(['targetProduct'])))->response()->setStatusCode(201);
    }

    public function show(Project $project): ProjectResource
    {
        $project->load(['targetProduct', 'entries' => fn($q) => $q->orderBy('entry_date')->orderBy('id'), 'entries.partner']);
        $project->loadCount('entries');
        return new ProjectResource($project);
    }

    public function update(StoreProjectRequest $request, Project $project): ProjectResource
    {
        $updated = $this->service->update($project, $request->validated(), $request->user()?->id);
        return new ProjectResource($updated->load(['targetProduct']));
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->service->delete($project);
        return response()->json(['data' => ['message' => 'Project deleted.']]);
    }

    /* ============================================================ Cost entries */

    public function addEntry(StoreCostEntryRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $entry = $this->service->addEntry($project, $request->validated(), $request->user()?->id);
        return (new ProjectCostEntryResource($entry))->response()->setStatusCode(201);
    }

    public function updateEntry(StoreCostEntryRequest $request, Project $project, ProjectCostEntry $entry): ProjectCostEntryResource
    {
        $this->authorize('update', $project);
        abort_unless($entry->project_id === $project->id, 404);
        $updated = $this->service->updateEntry($entry, $request->validated(), $request->user()?->id);
        return new ProjectCostEntryResource($updated);
    }

    public function deleteEntry(Project $project, ProjectCostEntry $entry): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($entry->project_id === $project->id, 404);
        $this->service->deleteEntry($entry);
        return response()->json(['data' => ['message' => 'Entry deleted.']]);
    }

    public function summary(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        return response()->json(['data' => $this->service->summary($project)]);
    }
}
