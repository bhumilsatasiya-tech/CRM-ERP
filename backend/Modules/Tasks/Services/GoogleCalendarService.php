<?php

namespace Modules\Tasks\Services;

use Modules\Tasks\Models\Task;
use RuntimeException;

/**
 * Google Calendar sync — STUB implementation.
 * To enable real sync:
 *   1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 *   2. Install google/apiclient via composer
 *   3. Replace getAuthUrl/handleCallback/pushTask bodies with real Google API calls.
 */
class GoogleCalendarService
{
    public function isConfigured(): bool
    {
        return ! empty(env('GOOGLE_CLIENT_ID')) && ! empty(env('GOOGLE_CLIENT_SECRET'));
    }

    public function getAuthUrl(int $userId): string
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google Calendar.');
        }
        // Real implementation would build Google OAuth consent URL.
        return 'about:blank';
    }

    public function handleCallback(string $code, int $userId): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Google Calendar is not configured.');
        }
        // Exchange $code for tokens and persist via OauthToken.
    }

    public function pushTask(Task $task, int $userId): string
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Google Calendar is not configured.');
        }
        // Real implementation would create the calendar event and return event id.
        return 'stub-event-id';
    }
}
