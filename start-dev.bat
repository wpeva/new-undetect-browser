@echo off
chcp 65001 > nul
title UndetectBrowser - Development Mode
color 0E

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           UndetectBrowser Development Mode                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Quick checks
if not exist "node_modules\" (
    echo [!] Installing dependencies...
    call npm install --legacy-peer-deps
)

:: Set development environment
set NODE_ENV=development
set ELECTRON_ENABLE_LOGGING=true

echo [*] Building TypeScript in watch mode...
echo [*] Press Ctrl+C to stop.
echo.

:: Start dev mode with watch
start "TypeScript Compiler" cmd /c "npm run build:watch"

:: Wait a moment for initial build
timeout /t 3 /nobreak > nul

echo [*] Starting Electron in dev mode...
call npm run electron:dev

echo.
echo [*] Development session ended.
pause
