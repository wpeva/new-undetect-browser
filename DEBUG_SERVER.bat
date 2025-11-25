@echo off
title UndetectBrowser - Server Debug
color 0E

cd /d "%~dp0"

set LOGFILE=debug_log.txt

echo ================================================================ > %LOGFILE%
echo   UndetectBrowser Server Debug Log >> %LOGFILE%
echo   Date: %date% %time% >> %LOGFILE%
echo ================================================================ >> %LOGFILE%

echo.
echo ================================================================
echo     UndetectBrowser - Server Debug
echo     Log: %LOGFILE%
echo ================================================================
echo.

echo [1] Checking Node.js...
echo [1] Checking Node.js... >> %LOGFILE%
node --version >> %LOGFILE% 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found!
    echo   ERROR: Node.js not found! >> %LOGFILE%
    pause
    exit /b 1
)
echo   OK!

echo [2] Checking dist folder...
echo [2] Checking dist folder... >> %LOGFILE%
echo.
echo Files in dist: >> %LOGFILE%
dir dist >> %LOGFILE% 2>&1
echo.
echo Files in dist\server: >> %LOGFILE%
dir dist\server >> %LOGFILE% 2>&1
echo.

if exist "dist\server" (
    echo   dist\server exists
    echo   dist\server exists >> %LOGFILE%
) else (
    echo   ERROR: dist\server NOT FOUND!
    echo   ERROR: dist\server NOT FOUND! >> %LOGFILE%
    echo   Running build...
    call npx tsc --skipLibCheck 2>&1 >> %LOGFILE%
)

echo [3] Looking for server files...
echo [3] Looking for server files... >> %LOGFILE%

set SERVER_FILE=
if exist "dist\server\index-v2.js" (
    set SERVER_FILE=dist\server\index-v2.js
    echo   Found: index-v2.js
    echo   Found: index-v2.js >> %LOGFILE%
)
if exist "dist\server\index.js" (
    set SERVER_FILE=dist\server\index.js
    echo   Found: index.js
    echo   Found: index.js >> %LOGFILE%
)

if "%SERVER_FILE%"=="" (
    echo   ERROR: No server file found!
    echo   ERROR: No server file found! >> %LOGFILE%
    echo.
    echo   All JS files in dist\server: >> %LOGFILE%
    dir dist\server\*.js /b >> %LOGFILE% 2>&1
    echo.
    echo Checking package.json scripts... >> %LOGFILE%
    findstr /C:"server" package.json >> %LOGFILE% 2>&1
    pause
    exit /b 1
)

echo [4] Checking .env...
echo [4] Checking .env... >> %LOGFILE%
if exist ".env" (
    echo   .env exists
    echo   .env content: >> %LOGFILE%
    type .env >> %LOGFILE%
) else (
    echo   Creating .env...
    echo PORT=3000> .env
    echo NODE_ENV=development>> .env
    echo HOST=127.0.0.1>> .env
    echo JWT_SECRET=debug123>> .env
    echo HEADLESS=false>> .env
    echo CLOUD_MODE=false>> .env
)

echo [5] Starting server with full debug output...
echo [5] Starting server with full debug output... >> %LOGFILE%
echo.
echo ================================================================
echo   Server: %SERVER_FILE%
echo   URL: http://localhost:3000
echo   Press Ctrl+C to stop
echo ================================================================
echo.

echo --- SERVER START --- >> %LOGFILE%
echo Command: node %SERVER_FILE% >> %LOGFILE%
echo. >> %LOGFILE%

:: Run with DEBUG enabled
set DEBUG=*
set NODE_ENV=development

node %SERVER_FILE% 2>&1

echo.
echo --- SERVER STOPPED --- >> %LOGFILE%
echo Server stopped at %time% >> %LOGFILE%

echo.
echo Server stopped. Check %LOGFILE% for errors.
pause
