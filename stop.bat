@echo off
setlocal
title D'DECOR ID Card Studio - Stop
cd /d "%~dp0"

echo Stopping D'DECOR ID Card Studio...
docker compose down

echo.
echo [OK] Stopped. Your data (users, cards, audit log) is preserved in Docker volumes.
echo.
echo     To ERASE ALL DATA and start fresh (re-seeds the superadmin from .env):
echo         docker compose down -v
echo.
ping -n 4 127.0.0.1 >nul
exit /b 0
