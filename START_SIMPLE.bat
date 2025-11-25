@echo off
title UndetectBrowser
color 0B

echo.
echo ================================================================
echo     UndetectBrowser - Launcher
echo ================================================================
echo.

cd /d "%~dp0"

echo Checking installation...

if not exist "node_modules" (
    echo Installing packages...
    call npm install --legacy-peer-deps
)

if not exist "dist\server" (
    echo Building...
    call npm run build:win
    if errorlevel 1 call npx tsc --skipLibCheck
)

if not exist ".env" (
    echo Creating config...
    echo PORT=3000> .env
    echo NODE_ENV=development>> .env
    echo HOST=127.0.0.1>> .env
    echo JWT_SECRET=secret123>> .env
    echo HEADLESS=false>> .env
    echo CLOUD_MODE=false>> .env
)

echo.
echo ================================================================
echo   Choose mode:
echo.
echo   1 = Desktop App (Electron)
echo   2 = Server (http://localhost:3000)
echo   3 = Browser Test
echo ================================================================
echo.

set /p CHOICE="Enter 1, 2 or 3: "

if "%CHOICE%"=="1" (
    echo Starting Desktop App...
    call npm run electron
)

if "%CHOICE%"=="2" (
    echo Starting Server...
    echo.
    echo Server: http://localhost:3000
    echo Press Ctrl+C to stop
    echo.
    call npm run server:v2
)

if "%CHOICE%"=="3" (
    echo Starting Browser Test...
    call node -e "require('puppeteer').launch({headless:false}).then(b=>b.newPage()).then(p=>p.goto('https://bot.sannysoft.com'))"
)

pause
