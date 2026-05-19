@echo off
REM ============================================================================
REM build-frontend.bat — build the React bundle locally on Windows
REM ============================================================================
REM
REM Use this when the VPS is too small to run `npm run build` (2 GB RAM boxes
REM can OOM during Vite's TypeScript pass). Builds on Windows, then upload-
REM to-server.bat ships the resulting `dist/` over to the server.
REM
REM Requires: Node.js 20+ on PATH.
REM ============================================================================

setlocal

set "FRONTEND_DIR=E:\CRM+ERP\frontend"
set "PROD_ENV=E:\CRM+ERP\Weblive\env\frontend.env.production"

if not exist "%FRONTEND_DIR%" (
    echo ERROR: %FRONTEND_DIR% not found.
    exit /b 1
)

if not exist "%PROD_ENV%" (
    echo ERROR: %PROD_ENV% not found.
    exit /b 1
)

echo ==^> Copying production .env into frontend
copy /Y "%PROD_ENV%" "%FRONTEND_DIR%\.env" >nul

echo ==^> npm ci
cd /d "%FRONTEND_DIR%"
call npm ci --no-audit --no-fund
if errorlevel 1 (
    echo ERROR: npm ci failed
    exit /b 1
)

echo ==^> npm run build
call npm run build
if errorlevel 1 (
    echo ERROR: build failed
    exit /b 1
)

if not exist "%FRONTEND_DIR%\dist" (
    echo ERROR: dist/ was not produced
    exit /b 1
)

echo.
echo ===============================================================
echo   Build complete.
echo   Output: %FRONTEND_DIR%\dist
echo   Size:
dir /s /b "%FRONTEND_DIR%\dist" | find /c /v ""
echo.
echo   Next: scripts\upload-to-server.bat
echo ===============================================================

endlocal
