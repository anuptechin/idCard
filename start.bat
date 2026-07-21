@echo off
setlocal
title D'DECOR ID Card Studio - Launcher
cd /d "%~dp0"

echo ============================================
echo   D'DECOR . ID Card Studio  (Docker)
echo ============================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo [X] Docker Desktop was not found. Install it from https://www.docker.com/products/docker-desktop
  echo.
  pause
  exit /b 1
)
docker info >nul 2>nul
if errorlevel 1 (
  echo [X] Docker is installed but not running. Please start Docker Desktop and try again.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [*] No .env found - creating one from .env.example
  copy ".env.example" ".env" >nul
  echo     Superadmin will be seeded as admin@ddecor.com / change-Me!  ^(edit .env to change^)
)

echo [*] Building and starting containers (first run can take a few minutes)...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [X] Startup failed. See the messages above.
  pause
  exit /b 1
)

echo [*] Waiting for the app to become ready...
ping -n 13 127.0.0.1 >nul
start "" http://localhost:4000

echo.
echo [OK] Studio is running at http://localhost:4000
echo      First login (superadmin):  admin@ddecor.com  /  change-Me!
echo      Stop it with stop.bat  (your data is preserved).
echo.
ping -n 4 127.0.0.1 >nul
exit /b 0
