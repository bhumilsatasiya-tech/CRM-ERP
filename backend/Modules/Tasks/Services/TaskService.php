<?php

namespace Modules\Tasks\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Tasks\Models\Reminder;
use Modules\Tasks\Models\Task;
use RuntimeException;

class TaskService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 50), 200));
        return Task::query()
            ->with(['assignee:id,name,email'])
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where('title', 'like', '%'.$filters['search'].'%'))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(is_array($filters['status_in'] ?? null) && !empty($filters['status_in']), fn(Builder $q) => $q->whereIn('status', $filters['status_in']))
            ->when(($filters['priority'] ?? '') !== '', fn(Builder $q) => $q->where('priority', $filters['priority']))
            ->when(($filters['assignee_id'] ?? null), fn(Builder $q, $v) => $q->where('assignee_id', (int) $v))
            ->when(($filters['related_type'] ?? '') !== '', fn(Builder $q) => $q->where('related_type', $filters['related_type']))
            ->when(($filters['related_id'] ?? null), fn(Builder $q, $v) => $q->where('related_id', (int) $v))
            // Date filters: drives the dashboard "Today's tasks" widget.
            ->when(($filters['due_date_from'] ?? null), fn(Builder $q, $v) => $q->whereDate('due_date', '>=', $v))
            ->when(($filters['due_date_to'] ?? null),   fn(Builder $q, $v) => $q->whereDate('due_date', '<=', $v))
            ->when(!empty($filters['has_due_date']),     fn(Builder $q) => $q->whereNotNull('due_date'))
            ->orderBy('due_date')->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $data, ?int $actorId = null): Task
    {
        return DB::transaction(function () use ($companyId, $data, $actorId) {
            $task = Task::create(array_merge($data, [
                'company_id' => $companyId,
                'status' => Task::STATUS_OPEN,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));
            if (! empty($data['reminder_at'])) {
                Reminder::create([
                    'company_id' => $companyId,
                    'task_id' => $task->id,
                    'notify_at' => $data['reminder_at'],
                    'channel' => $data['reminder_channel'] ?? 'in_app',
                    'status' => Reminder::STATUS_PENDING,
                ]);
            }
            return $task->fresh(['assignee', 'reminders']);
        });
    }

    public function update(Task $task, array $data, ?int $actorId = null): Task
    {
        $task->fill($data);
        $task->updated_by = $actorId;
        $task->save();
        return $task->fresh(['assignee', 'reminders']);
    }

    public function delete(Task $task): void { $task->delete(); }

    public function complete(Task $task, ?int $actorId = null): Task
    {
        if ($task->status === Task::STATUS_DONE) return $task;
        $task->status = Task::STATUS_DONE;
        $task->completed_at = now();
        $task->updated_by = $actorId;
        $task->save();
        return $task;
    }

    public function reopen(Task $task, ?int $actorId = null): Task
    {
        $task->status = Task::STATUS_OPEN;
        $task->completed_at = null;
        $task->updated_by = $actorId;
        $task->save();
        return $task;
    }
}
