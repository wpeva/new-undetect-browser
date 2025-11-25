@echo off
setlocal enabledelayedexpansion
title UndetectBrowser - Installation Test
color 0B

cd /d "%~dp0"

echo.
echo ================================================================
echo       UndetectBrowser - Quick Installation Test
echo ================================================================
echo.

set PASSED=0
set FAILED=0

:: Test 1: Node.js
echo [TEST 1] Node.js installation...
node --version > nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Node.js not found
    set /a FAILED+=1
) else (
    for /f "tokens=*" %%v in ('node --version') do echo   [PASS] Node.js %%v
    set /a PASSED+=1
)

:: Test 2: npm
echo [TEST 2] npm installation...
npm --version > nul 2>&1
if errorlevel 1 (
    echo   [FAIL] npm not found
    set /a FAILED+=1
) else (
    for /f "tokens=*" %%v in ('npm --version') do echo   [PASS] npm v%%v
    set /a PASSED+=1
)

:: Test 3: node_modules
echo [TEST 3] Dependencies installed...
if exist "node_modules\puppeteer" (
    echo   [PASS] node_modules OK
    set /a PASSED+=1
) else (
    echo   [FAIL] node_modules missing or incomplete
    set /a FAILED+=1
)

:: Test 4: .env file
echo [TEST 4] Environment configuration...
if exist ".env" (
    echo   [PASS] .env file exists
    set /a PASSED+=1
) else (
    echo   [FAIL] .env file missing
    set /a FAILED+=1
)

:: Test 5: dist folder
echo [TEST 5] TypeScript build...
if exist "dist\server\index.js" (
    echo   [PASS] Server build OK
    set /a PASSED+=1
) else if exist "dist\server\index-v2.js" (
    echo   [PASS] Server v2 build OK
    set /a PASSED+=1
) else if exist "dist\electron\main.js" (
    echo   [PASS] Electron build OK
    set /a PASSED+=1
) else (
    echo   [FAIL] No build found
    set /a FAILED+=1
)

:: Test 6: Data directories
echo [TEST 6] Data directories...
if exist "data\profiles" (
    echo   [PASS] Data directories OK
    set /a PASSED+=1
) else (
    echo   [FAIL] Data directories missing
    set /a FAILED+=1
)

:: Test 7: Browser
echo [TEST 7] Browser availability...
set BROWSER_FOUND=0
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set BROWSER_FOUND=1
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set BROWSER_FOUND=1
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set BROWSER_FOUND=1
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set BROWSER_FOUND=1

if %BROWSER_FOUND%==1 (
    echo   [PASS] System browser found
    set /a PASSED+=1
) else (
    if exist "node_modules\puppeteer\.local-chromium" (
        echo   [PASS] Puppeteer Chromium found
        set /a PASSED+=1
    ) else (
        echo   [WARN] No browser - will be downloaded on first run
        set /a PASSED+=1
    )
)

:: Test 8: Port availability
echo [TEST 8] Port 3000 availability...
netstat -an | findstr ":3000 " | findstr "LISTENING" > nul 2>&1
if errorlevel 1 (
    echo   [PASS] Port 3000 is free
    set /a PASSED+=1
) else (
    echo   [WARN] Port 3000 is in use
    set /a PASSED+=1
)

:: Summary
echo.
echo ================================================================
echo.
set /a TOTAL=%PASSED%+%FAILED%

if %FAILED%==0 (
    color 0A
    echo   ALL TESTS PASSED! (%PASSED%/%TOTAL%)
    echo.
    echo   Your installation is ready to use!
    echo   Run START_APP.bat to launch the application.
) else (
    color 0E
    echo   TESTS: %PASSED% passed, %FAILED% failed
    echo.
    echo   Some tests failed. Run FIX_ERRORS.bat to fix issues.
)

echo.
pause
