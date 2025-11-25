@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title UndetectBrowser - API Server
color 0E

cd /d "%~dp0"

echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║            UndetectBrowser - API Server                       ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.

:: Quick checks
if not exist "node_modules" (
    echo [!] Dependencies missing - installing...
    call npm install --legacy-peer-deps --no-fund
)

if not exist "dist\server" (
    echo [!] Build missing - compiling...
    call npm run build:win 2>nul || call npx tsc --skipLibCheck
)

if not exist ".env" (
    echo [!] Creating default .env...
    copy ".env.example" ".env" 2>nul || (
        echo PORT=3000
        echo NODE_ENV=development
        echo HOST=127.0.0.1
    ) > .env
)

echo [*] Starting API Server...
echo.
echo   ┌─────────────────────────────────────────────────────────────┐
echo   │  Server: http://localhost:3000                              │
echo   │  API:    http://localhost:3000/api                          │
echo   │  Health: http://localhost:3000/health                       │
echo   │                                                             │
echo   │  Press Ctrl+C to stop                                       │
echo   └─────────────────────────────────────────────────────────────┘
echo.

:: Start server with error recovery
:server_loop
call npm run server:v2 2>&1

if errorlevel 1 (
    echo.
    echo [!] Server crashed. Restarting in 3 seconds...
    echo     Press Ctrl+C to exit, or wait to auto-restart.
    timeout /t 3 /nobreak > nul
    goto :server_loop
)

pause
