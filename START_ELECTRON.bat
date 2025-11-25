@echo off
title UndetectBrowser - Desktop App
color 0B

cd /d "%~dp0"

echo.
echo ================================================================
echo     UndetectBrowser - Desktop App
echo     Starting without rebuild...
echo ================================================================
echo.

:: Check if dist exists
if not exist "dist" (
    echo ERROR: dist folder not found!
    echo Run INSTALL_SIMPLE.bat first
    pause
    exit /b 1
)

:: Check if electron is installed
if not exist "node_modules\electron" (
    echo Installing Electron...
    npm install electron --save-dev
)

:: Check .env
if not exist ".env" (
    echo Creating .env...
    echo PORT=3000> .env
    echo NODE_ENV=development>> .env
    echo HOST=127.0.0.1>> .env
    echo JWT_SECRET=secret123>> .env
    echo HEADLESS=false>> .env
    echo CLOUD_MODE=false>> .env
)

echo Starting Electron...
echo.

npx electron .

pause
