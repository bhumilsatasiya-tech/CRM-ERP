<?php

namespace Modules\Tasks\Console;

use Illuminate\Console\Command;
use Modules\Tasks\Services\ReminderService;

class DispatchRemindersCommand extends Command
{
    protected $signature = 'reminders:dispatch';
    protected $description = 'Dispatch all due task reminders (in-app + email).';

    public function handle(ReminderService $service): int
    {
        $sent = $service->dispatchDue();
        $this->info("Sent {$sent} reminder(s).");
        return self::SUCCESS;
    }
}
