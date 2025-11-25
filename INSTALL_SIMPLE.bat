@echo off
title UndetectBrowser - Installer with Log
color 0A

cd /d "%~dp0"

set LOGFILE=install_log.txt

echo ================================================================ > %LOGFILE%
echo   UndetectBrowser Installation Log >> %LOGFILE%
echo   Date: %date% %time% >> %LOGFILE%
echo ================================================================ >> %LOGFILE%
echo. >> %LOGFILE%

echo.
echo ================================================================
echo     UndetectBrowser - Installer
echo     Log file: %LOGFILE%
echo ================================================================
echo.

echo [1/6] Checking Node.js...
echo [1/6] Checking Node.js... >> %LOGFILE%
node --version >> %LOGFILE% 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found! >> %LOGFILE%
    echo.
    echo ERROR: Node.js not found!
    echo.
    echo Install Node.js from https://nodejs.org/
    echo Then RESTART computer and run again.
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)
echo   Node.js OK >> %LOGFILE%
echo   OK!
echo.

echo [2/6] Creating folders...
echo [2/6] Creating folders... >> %LOGFILE%
mkdir data 2>> %LOGFILE%
mkdir data\profiles 2>> %LOGFILE%
mkdir data\sessions 2>> %LOGFILE%
mkdir data\logs 2>> %LOGFILE%
mkdir data\cache 2>> %LOGFILE%
mkdir dist 2>> %LOGFILE%
mkdir build 2>> %LOGFILE%
echo   Folders OK >> %LOGFILE%
echo   OK!
echo.

echo [3/6] Creating .env...
echo [3/6] Creating .env... >> %LOGFILE%
if not exist ".env" (
    echo PORT=3000> .env
    echo NODE_ENV=development>> .env
    echo HOST=127.0.0.1>> .env
    echo JWT_SECRET=secret123456789>> .env
    echo HEADLESS=false>> .env
    echo CLOUD_MODE=false>> .env
    echo DB_PATH=./data/undetect.db>> .env
    echo   Created new .env >> %LOGFILE%
) else (
    echo   .env already exists >> %LOGFILE%
)
echo   OK!
echo.

echo [4/6] Installing packages (3-5 min)...
echo [4/6] Installing packages... >> %LOGFILE%
echo. >> %LOGFILE%
echo --- NPM INSTALL OUTPUT --- >> %LOGFILE%
call npm install --legacy-peer-deps 2>&1 >> %LOGFILE%
echo --- END NPM INSTALL --- >> %LOGFILE%
echo. >> %LOGFILE%
echo   npm install done >> %LOGFILE%
echo   Done!
echo.

echo [5/6] Building TypeScript...
echo [5/6] Building TypeScript... >> %LOGFILE%
echo. >> %LOGFILE%
echo --- BUILD OUTPUT --- >> %LOGFILE%
call npx tsc --skipLibCheck 2>&1 >> %LOGFILE%
echo --- END BUILD --- >> %LOGFILE%
echo. >> %LOGFILE%
echo   Build done >> %LOGFILE%
echo   Done!
echo.

echo [6/6] Checking results...
echo [6/6] Checking results... >> %LOGFILE%
echo.
if exist "node_modules\puppeteer" (
    echo   node_modules: OK
    echo   node_modules: OK >> %LOGFILE%
) else (
    echo   node_modules: PROBLEM
    echo   node_modules: MISSING or incomplete >> %LOGFILE%
)
if exist ".env" (
    echo   .env: OK
    echo   .env: OK >> %LOGFILE%
) else (
    echo   .env: PROBLEM
    echo   .env: MISSING >> %LOGFILE%
)
if exist "dist\server" (
    echo   dist: OK
    echo   dist: OK >> %LOGFILE%
) else (
    echo   dist: PROBLEM - check log
    echo   dist: MISSING or build failed >> %LOGFILE%
)
echo.

echo ================================================================ >> %LOGFILE%
echo   Installation finished at %time% >> %LOGFILE%
echo ================================================================ >> %LOGFILE%

echo ================================================================
echo.
echo   DONE! Check install_log.txt for errors
echo.
echo   Run START_SIMPLE.bat to launch
echo.
echo ================================================================
echo.
pause
