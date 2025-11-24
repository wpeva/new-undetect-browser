@echo off
chcp 65001 > nul
title UndetectBrowser Server
color 0B

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               UndetectBrowser API Server v2.0                ║
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
    )
)

:: Create data directories
if not exist "data\" mkdir data
if not exist "data\profiles" mkdir data\profiles
if not exist "data\logs" mkdir data\logs

echo.
echo [*] Starting API Server...
echo [*] Server will be available at: http://localhost:3000
echo [*] Press Ctrl+C to stop the server.
echo.

:: Start server
call npm run server:v2

if errorlevel 1 (
    echo.
    echo [X] Server failed to start!
    echo.
    echo Common fixes:
    echo   1. Port 3000 may be in use - try: netstat -ano ^| findstr :3000
    echo   2. Run: npm run build
    echo   3. Check .env configuration
    echo.
    pause
)
