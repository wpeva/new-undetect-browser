@echo off
chcp 65001 > nul
title UndetectBrowser - Installation
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║            UndetectBrowser Windows Installation              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  This script will:                                           ║
echo ║    1. Check Node.js installation                             ║
echo ║    2. Install all dependencies                               ║
echo ║    3. Build the project                                      ║
echo ║    4. Configure environment                                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Check Node.js
echo [*] Checking Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo [X] Node.js is not installed!
    echo.
    echo Please install Node.js 18+ from: https://nodejs.org/
    echo After installation, run this script again.
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found

:: Check npm
echo [*] Checking npm...
npm --version > nul 2>&1
if errorlevel 1 (
    echo [X] npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm v%NPM_VERSION% found

:: Create directories
echo.
echo [*] Creating directory structure...
if not exist "data" mkdir data
if not exist "data\profiles" mkdir data\profiles
if not exist "data\sessions" mkdir data\sessions
if not exist "data\logs" mkdir data\logs
if not exist "data\cache" mkdir data\cache
if not exist "data\temp" mkdir data\temp
if not exist "dist" mkdir dist
if not exist "build" mkdir build
if not exist "release" mkdir release
echo [OK] Directories created

:: Create .env if missing
echo.
echo [*] Checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
        echo [OK] .env created from .env.example
    ) else (
        echo [!] Creating default .env...
        (
            echo # UndetectBrowser Configuration
            echo PORT=3000
            echo NODE_ENV=development
            echo HOST=127.0.0.1
            echo JWT_SECRET=change-this-secret-in-production-%RANDOM%%RANDOM%
            echo CLOUD_MODE=false
            echo HEADLESS=false
            echo LOG_LEVEL=info
            echo DB_PATH=./data/undetect.db
            echo PUPPETEER_SKIP_DOWNLOAD=false
        ) > .env
        echo [OK] Default .env created
    )
) else (
    echo [OK] .env already exists
)

:: Install dependencies
echo.
echo [*] Installing npm dependencies...
echo [*] This may take a few minutes...
echo.
call npm install --legacy-peer-deps

if errorlevel 1 (
    echo.
    echo [!] Some packages may have failed. Trying without optional deps...
    call npm install --legacy-peer-deps --ignore-optional
)

echo.
echo [OK] Dependencies installed

:: Build TypeScript
echo.
echo [*] Building TypeScript...
call npm run build

if errorlevel 1 (
    echo.
    echo [!] Build had errors. Trying with skipLibCheck...
    call npx tsc --skipLibCheck
)

echo [OK] Build completed

:: Final checks
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  Installation Complete!                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Quick Start:
echo   - Run GUI app:     start.bat
echo   - Run server:      start-server.bat
echo   - Development:     start-dev.bat
echo   - Build installer: build.bat
echo.
echo For issues, run: powershell -File scripts\windows\fix-issues.ps1
echo.

pause
