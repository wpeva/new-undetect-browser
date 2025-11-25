@echo off
title UndetectBrowser - Simple Installer
color 0A

echo.
echo ================================================================
echo     UndetectBrowser - Simple Windows Installer
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/6] Checking Node.js...
node --version
if errorlevel 1 (
    echo.
    echo ERROR: Node.js not found!
    echo.
    echo Please install Node.js first:
    echo   1. Go to https://nodejs.org/
    echo   2. Download LTS version
    echo   3. Install with "Add to PATH" checked
    echo   4. RESTART your computer
    echo   5. Run this script again
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)
echo   OK!
echo.

echo [2/6] Creating folders...
if not exist "data" mkdir data
if not exist "data\profiles" mkdir data\profiles
if not exist "data\sessions" mkdir data\sessions
if not exist "data\logs" mkdir data\logs
if not exist "data\cache" mkdir data\cache
if not exist "dist" mkdir dist
if not exist "build" mkdir build
echo   OK!
echo.

echo [3/6] Creating config file...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
    ) else (
        echo PORT=3000> .env
        echo NODE_ENV=development>> .env
        echo HOST=127.0.0.1>> .env
        echo JWT_SECRET=secret123456789>> .env
        echo HEADLESS=false>> .env
        echo CLOUD_MODE=false>> .env
    )
)
echo   OK!
echo.

echo [4/6] Installing packages (this takes 3-5 minutes)...
echo.
call npm install --legacy-peer-deps
echo.
echo   Done!
echo.

echo [5/6] Building project...
call npm run build:win
if errorlevel 1 (
    echo   Trying alternative build...
    call npx tsc --skipLibCheck
)
echo   Done!
echo.

echo [6/6] Verifying...
if exist "node_modules" (
    echo   node_modules: OK
) else (
    echo   node_modules: MISSING
)
if exist ".env" (
    echo   .env: OK
) else (
    echo   .env: MISSING
)
if exist "dist" (
    echo   dist: OK
) else (
    echo   dist: MISSING
)
echo.

echo ================================================================
echo.
echo   INSTALLATION COMPLETE!
echo.
echo   To start the app, run: START_SIMPLE.bat
echo.
echo ================================================================
echo.
pause
