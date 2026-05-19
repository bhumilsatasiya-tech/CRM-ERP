<?php

namespace Modules\Tasks\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id,
            'title' => $this->title, 'description' => $this->description,
            'due_date' => $this->due_date?->toIso8601String(),
            'assignee_id' => $this->assignee_id,
            'assignee' => $this->whenLoaded('assignee', fn() => $this->assignee ? ['id' => $this->assignee->id, 'name' => $this->assignee->name, 'email' => $this->assignee->email] : null),
            'status' => $this->status, 'priority' => $this->priority,
            'related_type' => $this->related_type,
            'related_id'   => $this->related_id,
            'google_event_id' => $this->google_event_id,
            'google_synced_at' => $this->google_synced_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'reminders' => $this->whenLoaded('reminders', fn() => $this->reminders->map(fn($r) => [
                'id' => $r->id, 'notify_at' => $r->notify_at?->toIso8601String(),
                'channel' => $r->channel, 'status' => $r->status,
                'sent_at' => $r->sent_at?->toIso8601String(),
            ])->values()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
