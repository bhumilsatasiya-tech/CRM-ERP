<?php

namespace Modules\Tasks\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Tasks\Console\DispatchRemindersCommand;
use Modules\Tasks\Models\Task;
use Modules\Tasks\Policies\TaskPolicy;
use Modules\Tasks\Services\GoogleCalendarService;
use Modules\Tasks\Services\ReminderService;
use Modules\Tasks\Services\TaskService;

class TasksServiceProvider extends ServiceProvider
{
    protected $policies = [
        Task::class => TaskPolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(TaskService::class);
        $this->app->singleton(ReminderService::class);
        $this->app->singleton(GoogleCalendarService::class);
    }

    public function boot(): void
    {
        $this->registerPolicies();
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Route::middleware('api')->prefix('api')->group(__DIR__ . '/../Routes/api.php');

        if ($this->app->runningInConsole()) {
            $this->commands([DispatchRemindersCommand::class]);
        }
    }
}
