@echo off
chcp 65001 >nul
title UndetectBrowser
color 0B

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║         UndetectBrowser - Starting...                ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: Check if built
if not exist "dist\server\index-v2.js" (
    echo [ERROR] Application not built!
    echo Please run INSTALL.bat first.
    pause
    exit /b 1
)

:: Check if frontend installed
if not exist "frontend\node_modules" (
    echo [ERROR] Frontend not installed!
    echo Please run INSTALL.bat first.
    pause
    exit /b 1
)

echo [INFO] Starting Backend Server on port 3000...
echo [INFO] Starting Frontend on port 3001...
echo.
echo ══════════════════════════════════════════════════════
echo   Open in browser: http://localhost:3001
echo ══════════════════════════════════════════════════════
echo.
echo   Press Ctrl+C to stop
echo.

:: Start backend in background
start "UndetectBrowser Backend" /min cmd /c "node dist\server\index-v2.js"

:: Wait for backend to start
timeout /t 2 /nobreak >nul

:: Start frontend (this will show output)
cd frontend
call npm run dev

:: If frontend exits, kill backend
taskkill /fi "WINDOWTITLE eq UndetectBrowser Backend" /f >nul 2>&1
