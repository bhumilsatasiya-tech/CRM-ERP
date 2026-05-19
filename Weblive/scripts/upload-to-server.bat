@echo off
REM ============================================================================
REM upload-to-server.bat — push frontend dist + backend code to the VPS
REM ============================================================================
REM
REM Uses scp (bundled with Windows 10+ via OpenSSH). For backend updates, prefer
REM the git-pull path on the server via deploy.sh. This script is for two cases:
REM   1) initial upload before git is set up
REM   2) sending the locally-built frontend dist/ when the VPS can't build
REM
REM Edit SERVER_USER and SERVER_HOST below before first run.
REM ============================================================================

setlocal

set "SERVER_USER=deploy"
set "SERVER_HOST=<SERVER_IP_OR_HOSTNAME>"
set "REMOTE_BASE=/var/www/crm-erp"

set "FRONTEND_DIST=E:\CRM+ERP\frontend\dist"

if "%SERVER_HOST%"=="<SERVER_IP_OR_HOSTNAME>" (
    echo ERROR: edit this script and set SERVER_HOST first.
    exit /b 1
)

echo Choose what to upload:
echo   1. Frontend dist/ only (most common after build-frontend.bat)
echo   2. Entire backend folder (initial upload before git)
echo   3. Server setup scripts ^(server-setup\*.sh + env\*.production + nginx\*.conf^)
echo   4. Cancel
set /p choice="Choice [1-4]: "

if "%choice%"=="1" goto upload_frontend
if "%choice%"=="2" goto upload_backend
if "%choice%"=="3" goto upload_setup
goto end

:upload_frontend
if not exist "%FRONTEND_DIST%" (
    echo ERROR: %FRONTEND_DIST% not found. Run build-frontend.bat first.
    exit /b 1
)
echo ==^> Uploading dist/ to %SERVER_USER%@%SERVER_HOST%:%REMOTE_BASE%/frontend/
REM Stage to a temp dir on the server, then swap atomically
ssh %SERVER_USER%@%SERVER_HOST% "rm -rf %REMOTE_BASE%/frontend/dist.new && mkdir -p %REMOTE_BASE%/frontend/dist.new"
scp -r "%FRONTEND_DIST%\*" %SERVER_USER%@%SERVER_HOST%:%REMOTE_BASE%/frontend/dist.new/
ssh %SERVER_USER%@%SERVER_HOST% "rm -rf %REMOTE_BASE%/frontend/dist.old && mv %REMOTE_BASE%/frontend/dist %REMOTE_BASE%/frontend/dist.old 2>/dev/null; mv %REMOTE_BASE%/frontend/dist.new %REMOTE_BASE%/frontend/dist && sudo /bin/systemctl reload nginx"
echo Done.
goto end

:upload_backend
echo WARNING: Uploading the whole backend folder is slow. Prefer `git pull`.
set /p confirm="Continue? [y/N] "
if /i not "%confirm%"=="y" goto end
echo ==^> Uploading backend/ to %SERVER_USER%@%SERVER_HOST%:%REMOTE_BASE%/
scp -r "E:\CRM+ERP\backend" %SERVER_USER%@%SERVER_HOST%:%REMOTE_BASE%/
echo Done. Now SSH in and run composer install + cache:clear.
goto end

:upload_setup
echo ==^> Uploading setup scripts and configs to %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\server-setup\*.sh"           %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\env\backend.env.production"  %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\env\frontend.env.production" %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\nginx\api.conf"              %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\nginx\app.conf"              %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\supervisor\crm-queue.conf"   %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\scripts\backup-db.sh"        %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\scripts\restore-db.sh"       %SERVER_USER%@%SERVER_HOST%:~/
scp "E:\CRM+ERP\Weblive\scripts\deploy.sh"           %SERVER_USER%@%SERVER_HOST%:~/
echo Done. SSH in and start with: chmod +x ~/*.sh
goto end

:end
endlocal
