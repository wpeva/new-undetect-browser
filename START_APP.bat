@echo off
setlocal enabledelayedexpansion
title UndetectBrowser - Starting...
color 0B

cd /d "%~dp0"

echo.
echo ================================================================
echo       UndetectBrowser - Smart Launcher
echo ================================================================
echo.

:: ============================================================================
:: PRE-FLIGHT CHECKS WITH AUTO-REPAIR
:: ============================================================================

echo [*] Running pre-flight checks...
echo.

set NEED_REPAIR=0

:: Check 1: Node.js
node --version > nul 2>&1
if errorlevel 1 (
    echo   [X] Node.js not found!
    echo   [*] Please run INSTALL_WINDOWS.bat first
    pause
    exit /b 1
)
echo   [OK] Node.js found

:: Check 2: node_modules
if not exist "node_modules" (
    echo   [!] node_modules missing - auto-installing...
    call npm install --legacy-peer-deps --no-fund --no-audit
    if errorlevel 1 (
        echo   [X] Installation failed!
        pause
        exit /b 1
    )
)
echo   [OK] Dependencies ready

:: Check 3: .env file
if not exist ".env" (
    echo   [!] .env missing - creating default...
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
    ) else (
        (
            echo PORT=3000
            echo NODE_ENV=development
            echo HOST=127.0.0.1
            echo JWT_SECRET=auto-generated-secret-%RANDOM%%RANDOM%%RANDOM%
            echo HEADLESS=false
            echo CLOUD_MODE=false
        ) > .env
    )
)
echo   [OK] Configuration ready

:: Check 4: dist folder
if not exist "dist\electron\main.js" (
    if not exist "dist\server\index.js" (
        echo   [!] Build missing - compiling...
        call npm run build:win 2>nul
        if errorlevel 1 (
            call npx tsc --skipLibCheck 2>nul
        )
    )
)
echo   [OK] Build ready

:: Check 5: Data directories
for %%d in (data data\profiles data\sessions data\logs) do (
    if not exist "%%d" mkdir "%%d" 2>nul
)
echo   [OK] Data directories ready

echo.
echo [OK] All checks passed!
echo.

:: ============================================================================
:: LAUNCH APPLICATION
:: ============================================================================

echo ================================================================
echo   Select launch mode:
echo.
echo     [1] Desktop Application (Electron GUI) - RECOMMENDED
echo     [2] Server Mode (API + Web Interface)
echo     [3] Development Mode (with hot reload)
echo     [4] Quick Browser Test
echo.
echo ================================================================
echo.

choice /c 1234 /n /m "Enter choice (1-4): "
set CHOICE=%errorlevel%

echo.

if %CHOICE%==1 (
    echo [*] Starting Desktop Application...
    echo.
    title UndetectBrowser - Desktop App
    call npm run electron
    goto :end
)

if %CHOICE%==2 (
    echo [*] Starting Server Mode...
    echo.
    echo   Server will be available at: http://localhost:3000
    echo   Press Ctrl+C to stop the server
    echo.
    title UndetectBrowser - Server
    call npm run server:v2
    goto :end
)

if %CHOICE%==3 (
    echo [*] Starting Development Mode...
    echo.
    title UndetectBrowser - Development
    call npm run server:dev:v2
    goto :end
)

if %CHOICE%==4 (
    echo [*] Running Quick Browser Test...
    echo.
    title UndetectBrowser - Test
    call node -e "const p=require('puppeteer');(async()=>{const b=await p.launch({headless:false});const pg=await b.newPage();await pg.goto('https://bot.sannysoft.com');console.log('Browser test running... Close browser to exit.');await new Promise(r=>setTimeout(r,30000));await b.close();})()"
    goto :end
)

:end
echo.
echo [*] Application closed.
pause
