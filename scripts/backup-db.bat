@echo off
REM Dump the local MySQL database to E:\CRM+ERP\storage\backups\
set TS=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%
set TS=%TS: =0%
set OUT=E:\CRM+ERP\storage\backups\crm_erp_%TS%.sql

if not exist E:\CRM+ERP\storage\backups mkdir E:\CRM+ERP\storage\backups

echo Backing up to %OUT%
mysqldump -u crm_erp_user -p crm_erp > "%OUT%"
echo Done.
