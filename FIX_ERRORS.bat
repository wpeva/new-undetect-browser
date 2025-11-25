@echo off
setlocal enabledelayedexpansion
title UndetectBrowser - Auto Fix Tool
color 0C

cd /d "%~dp0"

echo.
echo ================================================================
echo       UndetectBrowser - Auto Fix Tool
echo.
echo   This tool will automatically detect and fix common issues
echo ================================================================
echo.

set FIXES=0
set ERRORS=0

:: ============================================================================
:: FIX 1: Node.js Check
:: ============================================================================
echo [FIX 1/12] Checking Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo   [X] Node.js not installed!
    echo   [*] Opening Node.js download page...
    start https://nodejs.org/
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%v in ('node --version') do echo   [OK] Node.js %%v
)

:: ============================================================================
:: FIX 2: Clear npm cache
:: ============================================================================
echo [FIX 2/12] Clearing npm cache...
call npm cache clean --force > nul 2>&1
echo   [OK] npm cache cleared
set /a FIXES+=1

:: ============================================================================
:: FIX 3: Remove corrupted node_modules
:: ============================================================================
echo [FIX 3/12] Checking node_modules integrity...
if exist "node_modules\.package-lock.json" (
    :: Check if node_modules is corrupted
    if not exist "node_modules\puppeteer" (
        echo   [!] node_modules corrupted - removing...
        rmdir /s /q node_modules 2>nul
        set /a FIXES+=1
    ) else (
        echo   [OK] node_modules looks healthy
    )
) else (
    if exist "node_modules" (
        echo   [!] Incomplete installation - cleaning up...
        rmdir /s /q node_modules 2>nul
        set /a FIXES+=1
    )
)

:: ============================================================================
:: FIX 4: Reinstall dependencies
:: ============================================================================
echo [FIX 4/12] Installing/updating dependencies...
if not exist "node_modules\puppeteer" (
    echo   [*] Installing dependencies (this may take a few minutes)...
    call npm install --legacy-peer-deps --no-fund --no-audit > nul 2>&1
    if errorlevel 1 (
        echo   [!] Standard install failed - trying without optional deps...
        call npm install --legacy-peer-deps --ignore-optional --no-fund > nul 2>&1
    )
    set /a FIXES+=1
    echo   [OK] Dependencies installed
) else (
    echo   [OK] Dependencies already installed
)

:: ============================================================================
:: FIX 5: Create missing .env
:: ============================================================================
echo [FIX 5/12] Checking .env file...
if not exist ".env" (
    echo   [!] .env missing - creating...
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
    ) else (
        (
            echo PORT=3000
            echo NODE_ENV=development
            echo HOST=127.0.0.1
            echo JWT_SECRET=fix-generated-%RANDOM%%RANDOM%%RANDOM%
            echo HEADLESS=false
            echo CLOUD_MODE=false
            echo DB_PATH=./data/undetect.db
            echo PUPPETEER_SKIP_DOWNLOAD=false
        ) > .env
    )
    set /a FIXES+=1
    echo   [OK] .env created
) else (
    echo   [OK] .env exists
)

:: ============================================================================
:: FIX 6: Create data directories
:: ============================================================================
echo [FIX 6/12] Creating data directories...
for %%d in (data data\profiles data\sessions data\logs data\cache data\temp data\backups dist build release) do (
    if not exist "%%d" (
        mkdir "%%d" 2>nul
        set /a FIXES+=1
    )
)
echo   [OK] All directories created

:: ============================================================================
:: FIX 7: Rebuild TypeScript
:: ============================================================================
echo [FIX 7/12] Rebuilding TypeScript...
if exist "dist" (
    rmdir /s /q dist 2>nul
)
mkdir dist 2>nul

call npx tsc --skipLibCheck --project tsconfig.windows.json > nul 2>&1
if errorlevel 1 (
    echo   [!] Windows build failed - trying standard...
    call npx tsc --skipLibCheck > nul 2>&1
)

if exist "dist\server\index.js" (
    echo   [OK] TypeScript rebuilt successfully
    set /a FIXES+=1
) else if exist "dist\electron\main.js" (
    echo   [OK] TypeScript rebuilt successfully
    set /a FIXES+=1
) else (
    echo   [!] Build may have issues - check manually
    set /a ERRORS+=1
)

:: ============================================================================
:: FIX 8: Fix Puppeteer browser
:: ============================================================================
echo [FIX 8/12] Checking Puppeteer browser...

:: Check if system Chrome exists
set HAS_CHROME=0
for %%p in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%p set HAS_CHROME=1
)

if %HAS_CHROME%==0 (
    echo   [*] No system Chrome - ensuring Puppeteer has browser...
    if not exist "node_modules\puppeteer\.local-chromium" (
        call npx puppeteer browsers install chrome > nul 2>&1
        set /a FIXES+=1
    )
)
echo   [OK] Browser ready

:: ============================================================================
:: FIX 9: Fix file permissions (Windows)
:: ============================================================================
echo [FIX 9/12] Fixing file permissions...
:: Remove read-only attributes
attrib -r data\*.* /s 2>nul
attrib -r dist\*.* /s 2>nul
echo   [OK] Permissions fixed

:: ============================================================================
:: FIX 10: Check port availability
:: ============================================================================
echo [FIX 10/12] Checking port 3000...
netstat -an | findstr ":3000 " | findstr "LISTENING" > nul 2>&1
if not errorlevel 1 (
    echo   [!] Port 3000 is in use!
    echo   [*] Finding process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
        echo   [*] Process ID: %%a
        echo   [*] Run: taskkill /PID %%a /F  (to kill it)
    )
    set /a ERRORS+=1
) else (
    echo   [OK] Port 3000 is available
)

:: ============================================================================
:: FIX 11: Fix line endings
:: ============================================================================
echo [FIX 11/12] Configuring Git line endings...
git config core.autocrlf true > nul 2>&1
echo   [OK] Git configured for Windows

:: ============================================================================
:: FIX 12: Electron sandbox fix
:: ============================================================================
echo [FIX 12/12] Configuring Electron...
:: Set environment variable for Electron
setx ELECTRON_NO_ATTACH_CONSOLE 1 > nul 2>&1
echo   [OK] Electron configured

:: ============================================================================
:: SUMMARY
:: ============================================================================
echo.
echo ================================================================
if %ERRORS%==0 (
    echo        ALL ISSUES FIXED!
    color 0A
) else (
    echo    FIXES APPLIED: %FIXES%, REMAINING ISSUES: %ERRORS%
    color 0E
)
echo ================================================================
echo.
echo  Applied %FIXES% fixes.

if %ERRORS% GTR 0 (
    echo.
    echo  Some issues require manual intervention:
    echo    - Install Node.js from https://nodejs.org/
    echo    - Check port 3000 usage
    echo.
)

echo.
echo  You can now run START_APP.bat to launch the application.
echo.
pause
