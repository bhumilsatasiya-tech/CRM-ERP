<?php

namespace Modules\Tasks\Services;

use Illuminate\Support\Facades\Log;
use Modules\Comms\Services\CommService;
use Modules\Tasks\Models\Reminder;

class ReminderService
{
    public function __construct() {}

    /**
     * Pick all pending reminders past their notify_at and dispatch.
     * For email channel uses CommService if Comms module is loaded.
     */
    public function dispatchDue(): int
    {
        $due = Reminder::where('status', Reminder::STATUS_PENDING)
            ->where('notify_at', '<=', now())
            ->limit(100)
            ->get();

        $sent = 0;
        foreach ($due as $r) {
            try {
                $task = $r->task;
                if (! $task) {
                    $r->forceFill(['status' => Reminder::STATUS_FAILED, 'error' => 'Task not found'])->save();
                    continue;
                }
                if ($r->channel === 'email' && app()->bound(CommService::class) && $task->assignee?->email) {
                    /** @var CommService $comms */
                    $comms = app(CommService::class);
                    $comms->sendEmail(
                        $task->assignee->email,
                        "Reminder: {$task->title}",
                        ($task->description ?? '') . ($task->due_date ? "\nDue: {$task->due_date}" : ''),
                        $task->company_id, get_class($task), $task->id, null
                    );
                }
                // For in_app: just mark sent — actual UI badge is the user fetching their reminders.
                $r->forceFill(['status' => Reminder::STATUS_SENT, 'sent_at' => now()])->save();
                $sent++;
            } catch (\Throwable $e) {
                Log::warning("Reminder #{$r->id} dispatch failed: " . $e->getMessage());
                $r->forceFill(['status' => Reminder::STATUS_FAILED, 'error' => substr($e->getMessage(), 0, 1000)])->save();
            }
        }
        return $sent;
    }
}
