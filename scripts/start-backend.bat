@echo off
REM Start the Laravel backend dev server on http://127.0.0.1:8000
cd /d E:\CRM+ERP\backend
echo === CRM+ERP Backend (Laravel) ===
php artisan serve --host=127.0.0.1 --port=8000
