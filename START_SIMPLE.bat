@echo off
title UndetectBrowser
color 0B

cd /d "%~dp0"

set LOGFILE=start_log.txt

echo ================================================================ > %LOGFILE%
echo   UndetectBrowser Start Log >> %LOGFILE%
echo   Date: %date% %time% >> %LOGFILE%
echo ================================================================ >> %LOGFILE%

echo.
echo ================================================================
echo     UndetectBrowser - Launcher
echo     Log: %LOGFILE%
echo ================================================================
echo.

echo Checking... >> %LOGFILE%

if not exist "node_modules" (
    echo Installing packages... >> %LOGFILE%
    echo Installing packages...
    call npm install --legacy-peer-deps 2>&1 >> %LOGFILE%
)

if not exist "dist\server" (
    echo Building... >> %LOGFILE%
    echo Building...
    call npx tsc --skipLibCheck 2>&1 >> %LOGFILE%
)

if not exist ".env" (
    echo Creating .env... >> %LOGFILE%
    echo PORT=3000> .env
    echo NODE_ENV=development>> .env
    echo HOST=127.0.0.1>> .env
    echo JWT_SECRET=secret123>> .env
    echo HEADLESS=false>> .env
    echo CLOUD_MODE=false>> .env
)

echo Ready! >> %LOGFILE%
echo.
echo ================================================================
echo   Choose mode:
echo.
echo   1 = Desktop App
echo   2 = Server (localhost:3000)
echo   3 = Browser Test
echo ================================================================
echo.

set /p CHOICE="Enter 1, 2 or 3: "

echo User chose: %CHOICE% >> %LOGFILE%

if "%CHOICE%"=="1" (
    echo Starting Desktop App... >> %LOGFILE%
    echo Starting Desktop App...
    call npm run electron 2>&1 >> %LOGFILE%
)

if "%CHOICE%"=="2" (
    echo Starting Server... >> %LOGFILE%
    echo.
    echo ================================================================
    echo   Server starting at http://localhost:3000
    echo   Press Ctrl+C to stop
    echo   Errors are logged to: %LOGFILE%
    echo ================================================================
    echo.
    echo --- SERVER OUTPUT --- >> %LOGFILE%
    if exist "dist\server\index-v2.js" (
        echo Found: dist\server\index-v2.js >> %LOGFILE%
        echo Starting server...
        node dist/server/index-v2.js
        echo Server exit code: %errorlevel% >> %LOGFILE%
    ) else if exist "dist\server\index.js" (
        echo Found: dist\server\index.js >> %LOGFILE%
        echo Starting server...
        node dist/server/index.js
        echo Server exit code: %errorlevel% >> %LOGFILE%
    ) else (
        echo ERROR: Server not built! >> %LOGFILE%
        echo.
        echo ERROR: Server files not found!
        echo Building now...
        call npx tsc --skipLibCheck
        if exist "dist\server\index-v2.js" (
            echo Build complete. Starting server...
            node dist/server/index-v2.js
        ) else (
            echo Build failed. Check install_log.txt
        )
    )
    echo --- END SERVER OUTPUT --- >> %LOGFILE%
)

if "%CHOICE%"=="3" (
    echo Starting Browser Test... >> %LOGFILE%
    echo Starting Browser Test...
    node -e "require('puppeteer').launch({headless:false}).then(b=>b.newPage()).then(p=>p.goto('https://bot.sannysoft.com'))" 2>&1 >> %LOGFILE%
)

echo Finished at %time% >> %LOGFILE%
pause
