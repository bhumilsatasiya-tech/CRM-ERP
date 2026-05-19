@echo off
REM Run the Laravel queue worker (jobs: emails, reminders, calendar sync, exports)
cd /d E:\CRM+ERP\backend
php artisan queue:work --tries=3 --backoff=10
