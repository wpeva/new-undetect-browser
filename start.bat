@echo off
chcp 65001 > nul
title UndetectBrowser - Starting...
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               UndetectBrowser Launcher v2.0                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [!] node_modules not found. Running installation...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [X] Installation failed!
        pause
        exit /b 1
    )
)

:: Check if dist exists
if not exist "dist\" (
    echo [!] dist not found. Building TypeScript...
    call npm run build
    if errorlevel 1 (
        echo [X] Build failed!
        pause
        exit /b 1
    )
)

:: Check if .env exists
if not exist ".env" (
    echo [!] .env not found. Creating from example...
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
        echo [OK] .env created
    ) else (
        echo [!] Creating default .env...
        (
            echo PORT=3000
            echo NODE_ENV=development
            echo HOST=127.0.0.1
            echo JWT_SECRET=development-secret-change-in-production
            echo CLOUD_MODE=false
            echo HEADLESS=false
            echo LOG_LEVEL=info
        ) > .env
    )
)

:: Create data directories
if not exist "data\" mkdir data
if not exist "data\profiles" mkdir data\profiles
if not exist "data\logs" mkdir data\logs

echo.
echo [*] Starting UndetectBrowser...
echo [*] This will open the desktop application.
echo.

:: Start Electron app
call npm run electron

if errorlevel 1 (
    echo.
    echo [X] Application crashed or failed to start!
    echo [*] Running auto-fix...
    echo.

    :: Try to fix issues
    if exist "scripts\windows\fix-issues.ps1" (
        powershell -ExecutionPolicy Bypass -File "scripts\windows\fix-issues.ps1"
    )

    echo.
    echo [*] Retrying...
    call npm run electron
)

echo.
echo [*] Application closed.
pause
