@echo off
REM ============================================================
REM Module 1.1 — Auth (one-time installer)
REM Run AFTER:
REM   1) PHP 8.2+, Composer, Node 20, Git are installed and on PATH
REM   2) MySQL is running (XAMPP) and DB "crm_erp" + user are created
REM ============================================================

setlocal
set ROOT=E:\CRM+ERP

echo.
echo === STEP 1/6 — Verifying tools ===
where php       >nul 2>&1 || (echo MISSING: php       & goto :missing)
where composer  >nul 2>&1 || (echo MISSING: composer  & goto :missing)
where node      >nul 2>&1 || (echo MISSING: node      & goto :missing)
where npm       >nul 2>&1 || (echo MISSING: npm       & goto :missing)

echo.
echo === STEP 2/6 — Scaffold Laravel into backend\ (if empty) ===
if not exist "%ROOT%\backend\artisan" (
  cd /d "%ROOT%"
  composer create-project laravel/laravel backend ^
    || (echo Laravel scaffold failed & exit /b 1)
)

echo.
echo === STEP 3/6 — Install PHP packages required by Module 1.1 ===
cd /d "%ROOT%\backend"
composer require ^
  laravel/sanctum:^4.0 ^
  spatie/laravel-permission:^6.0 ^
  spatie/laravel-activitylog:^4.8 ^
  || (echo composer require failed & exit /b 1)

echo.
echo === STEP 4/6 — Wire .env and Module 1.1 ServiceProvider ===
if not exist "%ROOT%\backend\.env" copy "%ROOT%\backend\.env.example" "%ROOT%\backend\.env" >nul
php artisan key:generate
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider" --tag="activitylog-migrations"

echo.
echo === STEP 5/6 — Run migrations + seeders ===
php artisan migrate --seed --force
php artisan db:seed --class="Modules\\Auth\\Database\\Seeders\\AuthDatabaseSeeder" --force

echo.
echo === STEP 6/6 — Frontend deps ===
if not exist "%ROOT%\frontend\package.json" (
  cd /d "%ROOT%"
  call npm create vite@latest frontend -- --template react-ts
)
cd /d "%ROOT%\frontend"
if not exist "%ROOT%\frontend\.env" copy "%ROOT%\frontend\.env.example" "%ROOT%\frontend\.env" >nul
call npm install ^
  antd ^
  @ant-design/icons ^
  axios ^
  react-router-dom ^
  @reduxjs/toolkit ^
  react-redux

echo.
echo ============================================================
echo  Module 1.1 installed.
echo  Backend:  E:\CRM+ERP\scripts\start-backend.bat
echo  Frontend: E:\CRM+ERP\scripts\start-frontend.bat
echo  Login:    admin@crm-erp.local / ChangeMe@123
echo ============================================================
goto :end

:missing
echo.
echo One or more required tools are missing. Install them and re-run this script:
echo   - PHP 8.2+        https://www.php.net/downloads
echo   - Composer 2.x    https://getcomposer.org/
echo   - Node 20 LTS     https://nodejs.org/
echo   - Git             https://git-scm.com/download/win
exit /b 1

:end
endlocal
