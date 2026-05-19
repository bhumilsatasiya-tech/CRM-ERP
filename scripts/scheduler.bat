@echo off
REM Run Laravel scheduler once. Add this .bat to Windows Task Scheduler to fire every 1 minute.
cd /d E:\CRM+ERP\backend
php artisan schedule:run
