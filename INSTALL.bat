@echo off
chcp 65001 >nul
title UndetectBrowser - Installation
color 0A

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║         UndetectBrowser - Installation               ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found
for /f "tokens=*" %%i in ('node -v') do echo     Version: %%i
echo.

:: Install backend dependencies
echo [1/3] Installing backend dependencies...
set PUPPETEER_SKIP_DOWNLOAD=true
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend install failed!
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
echo.

:: Build backend
echo [2/3] Building backend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] Backend built successfully
echo.

:: Install frontend dependencies
echo [3/3] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend install failed!
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend dependencies installed
echo.

:: Create data directories
if not exist "data" mkdir data
if not exist "data\profiles" mkdir data\profiles
if not exist "data\sessions" mkdir data\sessions

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║         Installation Complete!                       ║
echo ╠══════════════════════════════════════════════════════╣
echo ║  Run START.bat to launch the application             ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause
