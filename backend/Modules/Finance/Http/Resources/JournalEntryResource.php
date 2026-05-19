<?php

namespace Modules\Finance\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class JournalEntryResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id' => $this->id, 'company_id' => $this->company_id, 'code' => $this->code,
            'entry_date' => $this->entry_date?->toDateString(),
            'narration' => $this->narration,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'reference_no' => $this->reference_no,
            'total_debit' => (float) $this->total_debit,
            'total_credit' => (float) $this->total_credit,
            'status' => $this->status,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,
            'lines' => $this->whenLoaded('lines', fn() => $this->lines->map(fn($l) => [
                'id' => $l->id,
                'account_id' => $l->account_id,
                'account' => $l->account ? ['id' => $l->account->id, 'code' => $l->account->code, 'name' => $l->account->name, 'type' => $l->account->type] : null,
                'debit' => (float) $l->debit,
                'credit' => (float) $l->credit,
                'narration' => $l->narration,
            ])->values()),
            'lines_count' => $this->whenCounted('lines'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
