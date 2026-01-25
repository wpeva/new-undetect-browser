@echo off
title UndetectBrowser - Quick Start
color 0B

cd /d "%~dp0"

set LOGFILE=start_log.txt

echo ================================================================ > %LOGFILE%
echo   UndetectBrowser Start Log >> %LOGFILE%
echo   Date: %date% %time% >> %LOGFILE%
echo ================================================================ >> %LOGFILE%

echo.
echo ================================================================
echo.
echo              UndetectBrowser - Quick Start
echo.
echo ================================================================
echo.

REM Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
    goto :ip_found
)
:ip_found
set LOCAL_IP=%LOCAL_IP:~1%

echo Checking installation... >> %LOGFILE%

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js 20+ from https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo [1/3] Installing backend dependencies...
    echo Installing packages... >> %LOGFILE%
    call npm install --legacy-peer-deps 2>&1 >> %LOGFILE%
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install backend dependencies! >> %LOGFILE%
        echo.
        echo [ERROR] Failed to install dependencies!
        echo Check %LOGFILE% for details
        pause
        exit /b 1
    )
)

if exist "frontend" (
    if not exist "frontend\node_modules" (
        echo.
        echo [2/3] Installing frontend dependencies...
        cd frontend
        call npm install 2>&1 >> ..\%LOGFILE%
        cd ..
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Failed to install frontend dependencies! >> %LOGFILE%
            echo.
            echo [ERROR] Failed to install frontend dependencies!
            echo Check %LOGFILE% for details
            pause
            exit /b 1
        )
    )
)

REM Build if needed
if not exist "dist\server" (
    echo.
    echo [3/3] Building project...
    echo Building... >> %LOGFILE%
    call npx tsc --skipLibCheck 2>&1 >> %LOGFILE%
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Build failed! >> %LOGFILE%
        echo.
        echo [ERROR] Build failed!
        echo Check %LOGFILE% for details
        pause
        exit /b 1
    )
)

REM Create .env if missing
if not exist ".env" (
    echo Creating .env... >> %LOGFILE%
    (
        echo # UndetectBrowser Configuration
        echo PORT=3000
        echo NODE_ENV=development
        echo HOST=0.0.0.0
        echo.
        echo # Security
        echo JWT_SECRET=change-this-in-production
        echo ENABLE_AUTH=false
        echo.
        echo # CORS
        echo CORS_ORIGIN=http://localhost:3001
        echo.
        echo # Browser
        echo BROWSER_HEADLESS=false
        echo MAX_CONCURRENT_SESSIONS=10
        echo.
        echo # Cloud
        echo CLOUD_MODE=false
    ) > .env
)

echo.
echo ================================================================
echo   Installation complete! Choose startup mode:
echo ================================================================
echo.
echo   1) Web Interface (Recommended)
echo      - Backend:  http://localhost:3000
echo      - Frontend: http://localhost:3001
if defined LOCAL_IP (
    echo      - Mobile:   http://%LOCAL_IP%:3001
)
echo.
echo   2) Desktop App (Electron)
echo      - Standalone application
echo.
echo   3) Only Backend (API Server)
echo      - Server:   http://localhost:3000
echo.
echo   4) Browser Detection Test
echo      - Test anti-detection features
echo.
echo   5) Exit
echo.
echo ================================================================
echo.

set /p CHOICE="Enter your choice (1-5): "

echo User chose: %CHOICE% >> %LOGFILE%

if "%CHOICE%"=="1" goto :web_interface
if "%CHOICE%"=="2" goto :desktop_app
if "%CHOICE%"=="3" goto :backend_only
if "%CHOICE%"=="4" goto :browser_test
if "%CHOICE%"=="5" goto :end

echo.
echo [ERROR] Invalid choice!
pause
goto :end

REM ================================================================
REM Web Interface - Full Stack (Backend + Frontend)
REM ================================================================
:web_interface
echo.
echo ================================================================
echo   Starting Full Stack...
echo ================================================================
echo.
echo Starting Web Interface... >> %LOGFILE%

REM Check ports
netstat -ano | findstr :3000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [WARNING] Port 3000 is already in use!
    echo.
    set /p KILL_PORT="Kill process on port 3000? (Y/N): "
    if /i "%KILL_PORT%"=="Y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
            taskkill /F /PID %%a >nul 2>&1
        )
        echo Port 3000 freed.
    ) else (
        echo.
        echo Please stop the process manually and try again.
        pause
        goto :end
    )
)

echo.
echo [*] Starting Backend API...
echo [*] Backend will be available at: http://localhost:3000
echo.
start "UndetectBrowser Backend" cmd /c "node dist/server/index-v2.js 2>&1"

REM Wait for backend
timeout /t 5 /nobreak >nul

echo [*] Starting Frontend UI...
echo [*] Frontend will be available at: http://localhost:3001
echo.
cd frontend
start "UndetectBrowser Frontend" cmd /c "npm run dev"
cd ..

REM Wait for frontend
timeout /t 5 /nobreak >nul

echo.
echo ================================================================
echo   SUCCESS! UndetectBrowser is running
echo ================================================================
echo.
echo   Frontend:  http://localhost:3001
echo   Backend:   http://localhost:3000
if defined LOCAL_IP (
    echo.
    echo   Access from phone (same WiFi):
    echo   http://%LOCAL_IP%:3001
)
echo.
echo   Press any key to open in browser...
echo   (Windows will remain running in background)
echo.
echo ================================================================

pause >nul

REM Open browser
start http://localhost:3001

echo.
echo Browser opened! Servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause
goto :end

REM ================================================================
REM Desktop App - Electron
REM ================================================================
:desktop_app
echo.
echo ================================================================
echo   Starting Desktop Application...
echo ================================================================
echo.
echo Starting Desktop App... >> %LOGFILE%
call npm run electron:dev 2>&1 >> %LOGFILE%
goto :end

REM ================================================================
REM Backend Only
REM ================================================================
:backend_only
echo.
echo ================================================================
echo   Starting API Server...
echo ================================================================
echo.
echo Starting Server... >> %LOGFILE%
echo.
echo   Server starting at: http://localhost:3000
if defined LOCAL_IP (
    echo   Network access:     http://%LOCAL_IP%:3000
)
echo.
echo   Press Ctrl+C to stop
echo   Logs: %LOGFILE%
echo.
echo ================================================================
echo.

if exist "dist\server\index-v2.js" (
    echo Found: dist\server\index-v2.js >> %LOGFILE%
    node dist/server/index-v2.js
) else if exist "dist\server\index.js" (
    echo Found: dist\server\index.js >> %LOGFILE%
    node dist/server/index.js
) else (
    echo.
    echo [ERROR] Server files not found!
    echo Rebuilding...
    call npx tsc --skipLibCheck
    if exist "dist\server\index-v2.js" (
        node dist/server/index-v2.js
    ) else (
        echo Build failed. Check %LOGFILE%
        pause
    )
)
goto :end

REM ================================================================
REM Browser Test
REM ================================================================
:browser_test
echo.
echo ================================================================
echo   Starting Browser Detection Test...
echo ================================================================
echo.
echo Starting Browser Test... >> %LOGFILE%
echo Testing at: https://bot.sannysoft.com
echo.
node -e "require('puppeteer').launch({headless:false}).then(b=>b.newPage()).then(p=>p.goto('https://bot.sannysoft.com'))" 2>&1 >> %LOGFILE%
echo.
echo Test complete!
pause
goto :end

REM ================================================================
REM End
REM ================================================================
:end
echo Finished at %time% >> %LOGFILE%
echo.
echo Goodbye!
timeout /t 2 >nul
exit /b 0
