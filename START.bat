@echo off
title UndetectBrowser

echo.
echo ========================================================
echo          UndetectBrowser - Starting...
echo ========================================================
echo.

REM Check if built
if not exist "dist\server\index-v2.js" (
    echo [ERROR] Application not built!
    echo Please run INSTALL.bat first.
    pause
    exit /b 1
)

REM Check if frontend installed
if not exist "frontend\node_modules" (
    echo [ERROR] Frontend not installed!
    echo Please run INSTALL.bat first.
    pause
    exit /b 1
)

echo [INFO] Starting Backend Server on port 3000...
echo [INFO] Starting Frontend on port 3001...
echo.
echo ========================================================
echo   Open in browser: http://localhost:3001
echo ========================================================
echo.
echo   Press Ctrl+C to stop
echo.

REM Start backend in background
start "UndetectBrowser-Backend" /min cmd /c "node dist\server\index-v2.js"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
cd frontend
call npm run dev

REM If frontend exits, kill backend
taskkill /fi "WINDOWTITLE eq UndetectBrowser-Backend" /f >nul 2>&1
