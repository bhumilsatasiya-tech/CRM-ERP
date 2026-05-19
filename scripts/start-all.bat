@echo off
REM ===================================================================
REM start-all.bat — one-click bring-up for the whole local stack.
REM Opens 3 separate console windows so you can see each server's logs.
REM Close any window to stop just that service. To stop everything, close
REM all three windows.
REM ===================================================================

REM 1) MySQL via XAMPP (only if not already listening on :3306)
netstat -ano | findstr "LISTENING" | findstr ":3306" >nul
if errorlevel 1 (
  echo Starting MySQL...
  start "MySQL (XAMPP)" cmd /k "C:\xampp\mysql_start.bat"
  timeout /t 6 /nobreak >nul
) else (
  echo MySQL already running on :3306
)

REM 2) Laravel backend on :8000 (only if not already listening)
netstat -ano | findstr "LISTENING" | findstr ":8000" >nul
if errorlevel 1 (
  echo Starting Laravel backend on http://127.0.0.1:8000 ...
  start "Laravel backend (:8000)" cmd /k "cd /d E:\CRM+ERP\backend && set PATH=C:\xampp\php;%%PATH%% && php artisan serve --host=127.0.0.1 --port=8000"
  timeout /t 3 /nobreak >nul
) else (
  echo Laravel backend already running on :8000
)

REM 3) Vite frontend on :5173 (only if not already listening)
netstat -ano | findstr "LISTENING" | findstr ":5173" >nul
if errorlevel 1 (
  echo Starting Vite frontend on http://localhost:5173 ...
  start "Vite frontend (:5173)" cmd /k "cd /d E:\CRM+ERP\frontend && npm run dev"
  timeout /t 4 /nobreak >nul
) else (
  echo Vite frontend already running on :5173
)

echo.
echo ===================================================================
echo   All services started. Open the app at:
echo     http://localhost:5173
echo.
echo   Backend API:  http://127.0.0.1:8000/api/v1
echo   phpMyAdmin:   http://localhost/phpmyadmin   (start XAMPP Apache)
echo ===================================================================
echo.
pause
