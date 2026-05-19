<?php

namespace Modules\Tasks\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Tasks\Http\Requests\StoreTaskRequest;
use Modules\Tasks\Http\Resources\TaskResource;
use Modules\Tasks\Models\Task;
use Modules\Tasks\Services\GoogleCalendarService;
use Modules\Tasks\Services\TaskService;

class TaskController extends Controller
{
    public function __construct(private TaskService $service)
    {
        $this->authorizeResource(Task::class, 'task');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['search', 'status', 'priority', 'assignee_id', 'related_type', 'related_id', 'per_page', 'due_date_from', 'due_date_to', 'has_due_date']);
        if ($request->filled('status_in')) {
            $filters['status_in'] = is_array($request->input('status_in')) ? $request->input('status_in') : explode(',', (string) $request->input('status_in'));
        }
        return TaskResource::collection($this->service->paginate($filters));
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $task = $this->service->create($companyId, $request->validated(), $request->user()?->id);
        return (new TaskResource($task))->response()->setStatusCode(201);
    }

    public function show(Task $task): TaskResource
    {
        $task->load(['assignee', 'reminders']);
        return new TaskResource($task);
    }

    public function update(StoreTaskRequest $request, Task $task): TaskResource
    {
        $updated = $this->service->update($task, $request->validated(), $request->user()?->id);
        return new TaskResource($updated);
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->service->delete($task);
        return response()->json(['data' => ['message' => 'Task deleted.']]);
    }

    public function complete(Request $request, Task $task): TaskResource
    {
        return new TaskResource($this->service->complete($task, $request->user()?->id)->load(['assignee', 'reminders']));
    }

    public function reopen(Request $request, Task $task): TaskResource
    {
        return new TaskResource($this->service->reopen($task, $request->user()?->id)->load(['assignee', 'reminders']));
    }

    public function syncToGoogle(Request $request, Task $task, GoogleCalendarService $google): JsonResponse
    {
        if (! $google->isConfigured()) {
            return response()->json(['data' => ['message' => 'Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.']], 503);
        }
        $eventId = $google->pushTask($task, $request->user()?->id ?? 0);
        $task->forceFill(['google_event_id' => $eventId, 'google_synced_at' => now()])->save();
        return response()->json(['data' => ['google_event_id' => $eventId]]);
    }

    public function authUrl(Request $request, GoogleCalendarService $google): JsonResponse
    {
        if (! $google->isConfigured()) {
            return response()->json(['data' => ['message' => 'Google Calendar is not configured.', 'configured' => false]], 503);
        }
        return response()->json(['data' => ['url' => $google->getAuthUrl($request->user()?->id ?? 0), 'configured' => true]]);
    }

    public function callback(Request $request, GoogleCalendarService $google): JsonResponse
    {
        $google->handleCallback((string) $request->input('code'), $request->user()?->id ?? 0);
        return response()->json(['data' => ['message' => 'Connected to Google Calendar.']]);
    }
}
