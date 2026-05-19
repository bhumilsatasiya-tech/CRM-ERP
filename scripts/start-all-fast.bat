@echo off
REM ===================================================================
REM start-all-fast.bat — FAST mode (Apache + OPcache + persistent MySQL)
REM
REM Uses XAMPP Apache (multi-threaded) instead of `php artisan serve`
REM (single-threaded). Eliminates request queueing that caused 5-20s
REM dashboard waits.
REM
REM Prerequisites (one-time):
REM   1. Run scripts\setup-fast-backend.bat once. It enables OPcache,
REM      adds the Apache vhost for :8000, enables mod_deflate, and
REM      runs `httpd -t` to verify.
REM   2. After setup, just double-click this file from now on.
REM
REM Stop everything: close the MySQL + Apache + Vite console windows.
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

REM 2) Apache (multi-threaded, serves backend on :8000 via vhost)
netstat -ano | findstr "LISTENING" | findstr ":8000" >nul
if errorlevel 1 (
  echo Starting Apache (backend on http://127.0.0.1:8000) ...
  start "Apache (XAMPP)" cmd /k "C:\xampp\apache_start.bat"
  timeout /t 4 /nobreak >nul
) else (
  echo Apache already running on :8000
)

REM 3) Vite frontend on :5173
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
echo   FAST mode running. Apache replaces `artisan serve` for true
echo   multi-threaded request handling. Open the app at:
echo     http://localhost:5173
echo.
echo   Backend API:  http://127.0.0.1:8000/api/v1
echo   phpMyAdmin:   http://localhost/phpmyadmin
echo ===================================================================
echo.
pause
