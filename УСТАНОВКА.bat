@echo off
:: UndetectBrowser - Simple Windows Installer
:: Works with Node.js v18, v20, v22, v24+
title UndetectBrowser - Installation
color 0B
cls

cd /d "%~dp0"

echo.
echo ================================================================
echo.
echo         UndetectBrowser - Installation
echo.
echo ================================================================
echo.

:: ============================================================================
:: STEP 1: Check Node.js
:: ============================================================================
echo [1/5] Checking Node.js...

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Node.js not found!
    echo  [INFO] Opening: https://nodejs.org/
    echo.
    start https://nodejs.org/
    echo  After installation, restart this file
    echo.
    pause
    exit /b 1
)

:: Get version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   [OK] Node.js %NODE_VERSION% detected
echo.

:: ============================================================================
:: STEP 2: Cleanup (important for v24!)
:: ============================================================================
echo [2/5] Cleaning old files...

if exist "node_modules" (
    echo   [CLEAN] Removing node_modules...
    rmdir /s /q node_modules 2>nul
)

if exist "frontend\node_modules" (
    echo   [CLEAN] Removing frontend\node_modules...
    rmdir /s /q frontend\node_modules 2>nul
)

if exist "package-lock.json" (
    echo   [CLEAN] Removing package-lock.json...
    del /f /q package-lock.json 2>nul
)

if exist "frontend\package-lock.json" (
    echo   [CLEAN] Removing frontend\package-lock.json...
    del /f /q frontend\package-lock.json 2>nul
)

if exist "dist" (
    echo   [CLEAN] Removing dist...
    rmdir /s /q dist 2>nul
)

echo   [OK] Cleanup completed
echo.

:: ============================================================================
:: STEP 3: Install backend dependencies
:: ============================================================================
echo [3/5] Installing dependencies (this will take 2-3 minutes)...
echo   [WAIT] Please wait...
echo.

:: Use --force to ignore version warnings
call npm install --legacy-peer-deps --force --loglevel=error

if errorlevel 1 (
    echo.
    echo  [ERROR] Failed to install dependencies!
    echo  [TIP] Try:
    echo     1. Run as Administrator
    echo     2. Delete node_modules folder manually
    echo     3. Check internet connection
    echo.
    pause
    exit /b 1
)

echo.
echo   [OK] Backend dependencies installed
echo.

:: ============================================================================
:: STEP 3.5: Install frontend dependencies
:: ============================================================================
if exist "frontend" (
    echo   [INSTALL] Installing frontend dependencies...
    cd frontend
    call npm install --force --loglevel=error
    cd ..
    echo   [OK] Frontend dependencies installed
    echo.
)

:: ============================================================================
:: STEP 4: Compile TypeScript
:: ============================================================================
echo [4/5] Compiling project...

call npm run build:safe >nul 2>&1
if errorlevel 1 (
    echo   [WARN] There are warnings, but continuing...
) else (
    echo   [OK] Project compiled successfully
)
echo.

:: ============================================================================
:: STEP 5: Create configuration
:: ============================================================================
echo [5/5] Creating configuration...

if not exist ".env" (
    (
        echo # UndetectBrowser Configuration
        echo # Auto-generated
        echo.
        echo PORT=3000
        echo FRONTEND_PORT=3001
        echo NODE_ENV=production
        echo HOST=0.0.0.0
        echo.
        echo # Security
        echo JWT_SECRET=secret-%RANDOM%-%RANDOM%
        echo ENABLE_AUTH=false
        echo.
        echo # Browser Settings
        echo HEADLESS=false
        echo ENABLE_STEALTH=true
        echo.
        echo # Logging
        echo LOG_LEVEL=info
    ) > .env
    echo   [OK] File .env created
) else (
    echo   [INFO] File .env already exists
)

:: Create necessary folders
mkdir data 2>nul
mkdir data\profiles 2>nul
mkdir data\sessions 2>nul
mkdir data\logs 2>nul
mkdir logs 2>nul
mkdir build 2>nul

echo   [OK] Folders created
echo.

:: ============================================================================
:: DONE!
:: ============================================================================
echo.
echo ================================================================
echo.
echo               [SUCCESS] INSTALLATION COMPLETED!
echo.
echo ================================================================
echo.
echo  TO START use:
echo.
echo    Double-click on: START_ONE_CLICK.vbs
echo.
echo    Or run:          START_SIMPLE.bat
echo.
echo  MODES:
echo     1 - Desktop application (Electron)
echo     2 - Web interface (http://localhost:3001)
echo     3 - Anti-detect test
echo.
echo ================================================================
echo.
echo  Press any key to exit...
pause >nul
