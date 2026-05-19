@echo off
REM Reset database to a clean state and run all migrations + seeders.
REM WARNING: drops all tables. Only safe in local development.
cd /d E:\CRM+ERP\backend
echo This will DROP ALL TABLES in the configured database.
choice /M "Are you sure"
if errorlevel 2 goto :end
php artisan migrate:fresh --seed
echo.
echo === Done. ===
echo Default super-admin: admin@crm-erp.local / ChangeMe@123  (must change on first login)
:end
