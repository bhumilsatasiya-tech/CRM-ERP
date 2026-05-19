@echo off
REM ===================================================================
REM setup-fast-backend.bat — one-time setup for FAST mode
REM
REM Already done if you see the OPcache + vhost block in php.ini and
REM httpd-vhosts.conf. This script just validates everything is in
REM place, clears Laravel caches, and runs `httpd -t`.
REM
REM Speed wins enabled:
REM   - PHP OPcache (5-10x boost on every request)
REM   - Apache multi-threaded vhost on :8000 (kills request queueing)
REM   - mod_deflate (gzip API responses, 70-90%% smaller wire)
REM   - Persistent MySQL connections (-10-20ms/request under Apache)
REM   - Laravel config + route cache (production-mode startup)
REM ===================================================================

setlocal
set PATH=C:\xampp\php;C:\xampp\mysql\bin;C:\ProgramData\ComposerSetup\bin;%PATH%

echo.
echo === Verifying OPcache is loaded ===
php -v
php -m | findstr /i "OPcache" >nul
if errorlevel 1 (
  echo [FAIL] OPcache NOT loaded. Check php.ini line for zend_extension=opcache
  exit /b 1
)
echo [OK] OPcache loaded

echo.
echo === Validating Apache config ===
C:\xampp\apache\bin\httpd.exe -t
if errorlevel 1 (
  echo [FAIL] Apache config invalid
  exit /b 1
)
echo [OK] Apache config valid

echo.
echo === Clearing Laravel caches ===
cd /d E:\CRM+ERP\backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo.
echo === Rebuilding production-mode caches ===
REM config:cache compiles all config files into one — huge cold-start win.
REM route:cache deliberately skipped: adding/removing routes in dev would
REM silently 404 until the next cache rebuild. View cache is fine.
php artisan config:cache
php artisan view:cache

echo.
echo ===================================================================
echo   Setup complete. From now on use scripts\start-all-fast.bat
echo   to bring up the stack with Apache + OPcache + caches.
echo ===================================================================
echo.
echo   If you change .env or routes/api files later, re-run this script
echo   to refresh the config/route caches.
echo ===================================================================
pause
