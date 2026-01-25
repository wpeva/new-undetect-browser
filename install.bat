@echo off
title UndetectBrowser - Installation
color 0B
cls
cd /d "%~dp0"

echo.
echo ================================================================
echo         UndetectBrowser - Installation
echo ================================================================
echo.

echo [1/5] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    start https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo   [OK] Node.js %%i detected
echo.

echo [2/5] Cleaning old files...
if exist "node_modules" rmdir /s /q node_modules 2>nul
if exist "dist" rmdir /s /q dist 2>nul
if exist "package-lock.json" del /f /q package-lock.json 2>nul
echo   [OK] Cleanup completed
echo.

echo [3/5] Installing dependencies (2-3 minutes)...
call npm install --legacy-peer-deps --loglevel=error
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo   [OK] Dependencies installed
echo.

if exist "frontend" (
    echo [3.5/5] Installing frontend dependencies...
    cd frontend
    call npm install --loglevel=error
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo   [OK] Frontend dependencies installed
    echo.
)

echo [4/5] Compiling TypeScript...
call npm run build:safe
if errorlevel 1 (
    echo [ERROR] Build failed! Trying again...
    call npx tsc --skipLibCheck
    if errorlevel 1 (
        echo [ERROR] Build still failed!
        echo Check for errors above
        pause
        exit /b 1
    )
)
echo   [OK] Compiled successfully
echo.

echo [5/5] Creating config...
if not exist ".env" (
    echo PORT=3000> .env
    echo NODE_ENV=development>> .env
    echo HOST=0.0.0.0>> .env
    echo CORS_ORIGIN=http://localhost:3001>> .env
    echo HEADLESS=false>> .env
    echo CLOUD_MODE=false>> .env
    echo JWT_SECRET=change-this-in-production>> .env
)
mkdir data 2>nul
mkdir logs 2>nul
echo   [OK] Config created
echo.

echo ================================================================
echo        [SUCCESS] INSTALLATION COMPLETED!
echo ================================================================
echo.
echo  Next step: Run START_SIMPLE.bat
echo.
pause
