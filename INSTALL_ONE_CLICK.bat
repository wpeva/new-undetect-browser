@echo off
:: UndetectBrowser - One Click Installer
:: Automatic installation without console
title UndetectBrowser - One Click Installer
color 0B
mode con: cols=80 lines=30

cd /d "%~dp0"

:: Create logs folder
if not exist "logs" mkdir logs
set LOGFILE=logs\install_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOGFILE=%LOGFILE: =0%

echo ================================================================
echo.
echo          UndetectBrowser - One Click Installer
echo          Automatic installation and setup
echo.
echo ================================================================
echo.
echo  Installation will take 3-5 minutes
echo  Everything will be installed automatically
echo.
echo  Logs: %LOGFILE%
echo.
echo ================================================================
echo.

:: Initialize log
echo ================================================================ > "%LOGFILE%"
echo   UndetectBrowser - One Click Installation >> "%LOGFILE%"
echo   Date: %date% %time% >> "%LOGFILE%"
echo ================================================================ >> "%LOGFILE%"
echo. >> "%LOGFILE%"

:: ============================================================================
:: STEP 1: Check Node.js
:: ============================================================================
echo [1/7] Checking Node.js...
echo [1/7] Checking Node.js... >> "%LOGFILE%"

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo. >> "%LOGFILE%"
    echo ERROR: Node.js not found! >> "%LOGFILE%"
    echo.
    echo  ERROR: Node.js is not installed!
    echo.
    echo  You need to install Node.js 20 or higher
    echo  Opening download page...
    echo.
    start https://nodejs.org/
    echo  After installing Node.js:
    echo  1. Restart your computer
    echo  2. Run this file again
    echo.
    pause
    exit /b 1
)

node --version >> "%LOGFILE%" 2>&1
echo   [OK] Node.js installed
echo   OK: Node.js installed >> "%LOGFILE%"
echo.

:: ============================================================================
:: STEP 2: Check npm
:: ============================================================================
echo [2/7] Checking npm...
echo [2/7] Checking npm... >> "%LOGFILE%"

npm --version >> "%LOGFILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: npm not found!
    echo   ERROR: npm not found! >> "%LOGFILE%"
    pause
    exit /b 1
)

echo   [OK] npm available
echo   OK: npm available >> "%LOGFILE%"
echo.

:: ============================================================================
:: STEP 3: Clean previous installations (if any)
:: ============================================================================
echo [3/7] Cleaning old files...
echo [3/7] Cleaning old files... >> "%LOGFILE%"

if exist "node_modules" (
    echo   Removing old node_modules...
    echo   Removing old node_modules... >> "%LOGFILE%"
    rmdir /s /q node_modules 2>> "%LOGFILE%"
)

if exist "dist" (
    echo   Removing old dist...
    echo   Removing old dist... >> "%LOGFILE%"
    rmdir /s /q dist 2>> "%LOGFILE%"
)

if exist "package-lock.json" (
    echo   Removing package-lock.json...
    del /f /q package-lock.json 2>> "%LOGFILE%"
)

echo   [OK] Cleanup complete
echo   OK: Cleanup complete >> "%LOGFILE%"
echo.

:: ============================================================================
:: STEP 4: Create necessary folders
:: ============================================================================
echo [4/7] Creating project folders...
echo [4/7] Creating project folders... >> "%LOGFILE%"

mkdir data 2>nul
mkdir data\profiles 2>nul
mkdir data\sessions 2>nul
mkdir data\logs 2>nul
mkdir data\cache 2>nul
mkdir build 2>nul
mkdir logs 2>nul

echo   [OK] Folders created
echo   OK: Folders created >> "%LOGFILE%"
echo.

:: ============================================================================
:: STEP 5: Create .env file
:: ============================================================================
echo [5/7] Configuring environment...
echo [5/7] Configuring environment... >> "%LOGFILE%"

if not exist ".env" (
    echo   Creating .env file...
    (
        echo # UndetectBrowser - Auto Generated Configuration
        echo PORT=3000
        echo NODE_ENV=development
        echo HOST=0.0.0.0
        echo.
        echo # Security
        echo JWT_SECRET=change-this-secret-key-%RANDOM%%RANDOM%
        echo ENABLE_AUTH=false
        echo.
        echo # CORS
        echo CORS_ORIGIN=http://localhost:3001
        echo.
        echo # Browser Settings
        echo BROWSER_HEADLESS=false
        echo MAX_CONCURRENT_SESSIONS=10
        echo.
        echo # Database
        echo DB_PATH=./data/undetect.db
        echo.
        echo # Cloud Mode
        echo CLOUD_MODE=false
        echo.
        echo # Logs
        echo LOG_LEVEL=info
        echo LOG_PATH=./data/logs
    ) > .env
    echo   [OK] .env created
    echo   OK: .env created >> "%LOGFILE%"
) else (
    echo   [OK] .env already exists
    echo   OK: .env already exists >> "%LOGFILE%"
)
echo.

:: ============================================================================
:: STEP 6: Install dependencies
:: ============================================================================
echo [6/7] Installing dependencies (3-5 minutes)...
echo [6/7] Installing dependencies... >> "%LOGFILE%"
echo.
echo   This may take several minutes...
echo   Please wait...
echo.

echo   [6.1] Backend dependencies...
call npm install --legacy-peer-deps --loglevel=error 2>&1 >> "%LOGFILE%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   ERROR installing backend dependencies!
    echo   ERROR: Backend dependencies installation failed! >> "%LOGFILE%"
    echo.
    echo   Check log: %LOGFILE%
    echo.
    pause
    exit /b 1
)
echo   [OK] Backend dependencies installed

echo   [6.2] Frontend dependencies...
cd frontend
call npm install --loglevel=error 2>&1 >> "..\%LOGFILE%"
if %ERRORLEVEL% NEQ 0 (
    cd ..
    echo.
    echo   ERROR installing frontend dependencies!
    echo   ERROR: Frontend dependencies installation failed! >> "%LOGFILE%"
    echo.
    echo   Check log: %LOGFILE%
    echo.
    pause
    exit /b 1
)
cd ..
echo   [OK] Frontend dependencies installed
echo.

:: ============================================================================
:: STEP 7: Compile TypeScript
:: ============================================================================
echo [7/7] Compiling project...
echo [7/7] Building project... >> "%LOGFILE%"

call npx tsc --skipLibCheck 2>&1 >> "%LOGFILE%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   WARNING: TypeScript errors found
    echo   WARNING: TypeScript errors found >> "%LOGFILE%"
    echo.
    echo   Continuing with existing code...
    echo.
)

echo   [OK] Compilation complete
echo   OK: Build complete >> "%LOGFILE%"
echo.

:: ============================================================================
:: CHECK RESULTS
:: ============================================================================
echo.
echo ================================================================
echo                INSTALLATION CHECK
echo ================================================================
echo.

set INSTALL_OK=1

if exist "node_modules\puppeteer" (
    echo  [OK] Backend dependencies
) else (
    echo  [FAIL] Backend dependencies - FAILED
    set INSTALL_OK=0
)

if exist "frontend\node_modules" (
    echo  [OK] Frontend dependencies
) else (
    echo  [FAIL] Frontend dependencies - FAILED
    set INSTALL_OK=0
)

if exist ".env" (
    echo  [OK] Configuration file
) else (
    echo  [FAIL] Configuration file - MISSING
    set INSTALL_OK=0
)

if exist "dist\server" (
    echo  [OK] TypeScript compiled
) else (
    echo  [FAIL] TypeScript compiled - FAILED
    set INSTALL_OK=0
)

echo.
echo ================================================================
echo. >> "%LOGFILE%"
echo Installation completed at %time% >> "%LOGFILE%"
echo ================================================================ >> "%LOGFILE%"

if %INSTALL_OK% EQU 0 (
    echo.
    echo  INSTALLATION COMPLETED WITH ERRORS!
    echo.
    echo  Check log: %LOGFILE%
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo              INSTALLATION COMPLETED SUCCESSFULLY!
echo ================================================================
echo.
echo  All components installed and configured
echo.
echo  To start, use:
echo  * START_ONE_CLICK.vbs - Start without console (recommended)
echo  * START_SIMPLE.bat    - Start with console
echo.
echo  Installation log saved: %LOGFILE%
echo.
echo ================================================================
echo.

:: Create desktop shortcut (optional)
set /p CREATE_SHORTCUT="Create desktop shortcut? (Y/N): "
if /i "%CREATE_SHORTCUT%"=="Y" (
    echo.
    echo  Creating shortcut...
    powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\UndetectBrowser.lnk'); $Shortcut.TargetPath = '%CD%\START_ONE_CLICK.vbs'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.Description = 'UndetectBrowser - Antidetect Browser'; $Shortcut.Save()"
    echo  [OK] Shortcut created on desktop
    echo.
)

echo.
echo  Press any key to launch the application...
pause >nul

:: Launch application
if exist "START_ONE_CLICK.vbs" (
    start "" "START_ONE_CLICK.vbs"
) else (
    start "" "START_SIMPLE.bat"
)

exit /b 0
