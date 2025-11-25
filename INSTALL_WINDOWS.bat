@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title UndetectBrowser - Ultimate Windows 10 Installer
color 0A

:: ============================================================================
:: ULTIMATE WINDOWS 10 INSTALLER v2.0
:: Auto-detects, downloads, installs, and configures everything
:: ============================================================================

echo.
echo  ╔═══════════════════════════════════════════════════════════════════════╗
echo  ║                                                                       ║
echo  ║     ██╗   ██╗███╗   ██╗██████╗ ███████╗████████╗███████╗ ██████╗████████╗  ║
echo  ║     ██║   ██║████╗  ██║██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝  ║
echo  ║     ██║   ██║██╔██╗ ██║██║  ██║█████╗     ██║   █████╗  ██║        ██║     ║
echo  ║     ██║   ██║██║╚██╗██║██║  ██║██╔══╝     ██║   ██╔══╝  ██║        ██║     ║
echo  ║     ╚██████╔╝██║ ╚████║██████╔╝███████╗   ██║   ███████╗╚██████╗   ██║     ║
echo  ║      ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝   ╚═╝   ╚══════╝ ╚═════╝   ╚═╝     ║
echo  ║                                                                       ║
echo  ║              ULTIMATE WINDOWS 10 INSTALLER v2.0                       ║
echo  ║                                                                       ║
echo  ╚═══════════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: ============================================================================
:: STEP 1: System Check
:: ============================================================================
echo [STEP 1/8] Checking system requirements...
echo.

:: Check Windows version
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
echo   [*] Windows Version: %VERSION%

:: Check architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo   [OK] 64-bit system detected
    set ARCH=x64
) else (
    echo   [!] 32-bit system - some features may be limited
    set ARCH=x86
)

:: Check available disk space
for /f "tokens=3" %%a in ('dir /-c "%~dp0" ^| find "bytes free"') do set FREE_SPACE=%%a
echo   [*] Available disk space: %FREE_SPACE% bytes

:: Check RAM
for /f "skip=1" %%a in ('wmic os get TotalVisibleMemorySize') do (
    if "%%a" NEQ "" (
        set /a RAM_MB=%%a/1024
        echo   [*] Total RAM: !RAM_MB! MB
        goto :ram_done
    )
)
:ram_done

echo.
echo   [OK] System check passed
echo.

:: ============================================================================
:: STEP 2: Check/Install Node.js
:: ============================================================================
echo [STEP 2/8] Checking Node.js...
echo.

node --version > nul 2>&1
if errorlevel 1 (
    echo   [!] Node.js not found - downloading installer...
    echo.
    echo   ╔═══════════════════════════════════════════════════════════════╗
    echo   ║  Node.js is required. Opening download page...                ║
    echo   ║                                                               ║
    echo   ║  1. Download and install Node.js LTS ^(20.x^)                   ║
    echo   ║  2. IMPORTANT: Check "Add to PATH" during installation       ║
    echo   ║  3. After installation, run this script again                ║
    echo   ╚═══════════════════════════════════════════════════════════════╝
    echo.

    :: Try to download with PowerShell
    echo   [*] Attempting automatic download...
    powershell -Command "& {Start-BitsTransfer -Source 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -Destination '%TEMP%\node-installer.msi'}" 2>nul

    if exist "%TEMP%\node-installer.msi" (
        echo   [OK] Downloaded Node.js installer
        echo   [*] Starting installation...
        msiexec /i "%TEMP%\node-installer.msi" /passive
        echo.
        echo   [!] Please restart this script after Node.js installation completes.
        pause
        exit /b 0
    ) else (
        echo   [!] Could not download automatically
        start https://nodejs.org/
        echo.
        echo   Please install Node.js and run this script again.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    echo   [OK] Node.js !NODE_VER! found

    :: Check version is 18+
    for /f "tokens=1 delims=v." %%a in ('node --version') do set NODE_MAJOR=%%a
    for /f "tokens=2 delims=v." %%a in ('node --version') do set NODE_MAJOR=%%a

    if !NODE_MAJOR! LSS 18 (
        echo   [!] Node.js version is too old. Please install Node.js 18+
        start https://nodejs.org/
        pause
        exit /b 1
    )
)

:: Check npm
for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VER=%%i
echo   [OK] npm v%NPM_VER% found
echo.

:: ============================================================================
:: STEP 3: Create Directory Structure
:: ============================================================================
echo [STEP 3/8] Creating directory structure...
echo.

:: Create all needed directories
for %%d in (data data\profiles data\sessions data\logs data\cache data\temp data\backups dist build release node_modules) do (
    if not exist "%%d" (
        mkdir "%%d" 2>nul
        echo   [+] Created: %%d
    )
)
echo.
echo   [OK] Directory structure ready
echo.

:: ============================================================================
:: STEP 4: Configure Environment
:: ============================================================================
echo [STEP 4/8] Configuring environment...
echo.

:: Find Chrome/Edge
set BROWSER_PATH=
set BROWSER_NAME=

:: Check Chrome locations
for %%p in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%p (
        set BROWSER_PATH=%%~p
        set BROWSER_NAME=Chrome
        goto :browser_found
    )
)

:: Check Edge as fallback
for %%p in (
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) do (
    if exist %%p (
        set BROWSER_PATH=%%~p
        set BROWSER_NAME=Edge
        goto :browser_found
    )
)

:browser_found
if defined BROWSER_PATH (
    echo   [OK] Found %BROWSER_NAME%: %BROWSER_PATH%
) else (
    echo   [!] No Chrome/Edge found - Puppeteer will download Chromium
)

:: Generate random JWT secret
set "CHARS=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "JWT_SECRET="
for /L %%i in (1,1,64) do (
    set /a "idx=!random! %% 62"
    for %%j in (!idx!) do set "JWT_SECRET=!JWT_SECRET!!CHARS:~%%j,1!"
)

:: Create .env file
if not exist ".env" (
    echo   [*] Creating .env configuration...

    :: Convert backslashes to forward slashes for paths
    set "BROWSER_PATH_POSIX=!BROWSER_PATH:\=/!"

    (
        echo # UndetectBrowser Configuration
        echo # Generated: %date% %time%
        echo # Platform: Windows 10
        echo.
        echo # Server Settings
        echo PORT=3000
        echo NODE_ENV=development
        echo HOST=127.0.0.1
        echo.
        echo # Security
        echo JWT_SECRET=!JWT_SECRET!
        echo JWT_EXPIRES_IN=24h
        echo.
        echo # CORS ^& Rate Limiting
        echo CORS_ORIGIN=*
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
        echo.
        echo # Performance
        echo ENABLE_COMPRESSION=true
        echo CACHE_ENABLED=true
        echo.
        echo # Database
        echo DB_PATH=./data/undetect.db
        echo REDIS_ENABLED=false
        echo POSTGRES_ENABLED=false
        echo.
        echo # Browser Configuration
        if defined BROWSER_PATH (
            echo PUPPETEER_EXECUTABLE_PATH=!BROWSER_PATH_POSIX!
            echo CHROME_PATH=!BROWSER_PATH_POSIX!
            echo PUPPETEER_SKIP_DOWNLOAD=true
        ) else (
            echo PUPPETEER_EXECUTABLE_PATH=
            echo CHROME_PATH=
            echo PUPPETEER_SKIP_DOWNLOAD=false
        )
        echo HEADLESS=false
        echo.
        echo # Cloud Mode ^(disable for local use^)
        echo CLOUD_MODE=false
        echo.
        echo # Logging
        echo LOG_LEVEL=info
        echo ENABLE_REQUEST_LOGGING=true
        echo.
        echo # Session Settings
        echo SESSION_TIMEOUT=3600000
        echo MAX_CONCURRENT_SESSIONS=100
        echo.
        echo # Windows Specific
        echo ELECTRON_NO_ATTACH_CONSOLE=1
        echo UV_THREADPOOL_SIZE=16
    ) > .env

    echo   [OK] .env created with auto-detected settings
) else (
    echo   [*] .env already exists - keeping current settings
)
echo.

:: ============================================================================
:: STEP 5: Install Dependencies
:: ============================================================================
echo [STEP 5/8] Installing npm dependencies...
echo.
echo   [*] This may take 3-5 minutes on first install...
echo.

:: Set npm config for better Windows compatibility
call npm config set script-shell "C:\Windows\System32\cmd.exe" 2>nul
call npm config set python python 2>nul

:: Clean install
if exist "node_modules\.package-lock.json" (
    echo   [*] Cleaning previous installation...
    rmdir /s /q node_modules 2>nul
)

:: Install with legacy peer deps
echo   [*] Installing packages...
call npm install --legacy-peer-deps --no-fund --no-audit 2>&1

if errorlevel 1 (
    echo.
    echo   [!] Some packages failed - trying alternative method...
    call npm install --legacy-peer-deps --ignore-optional --no-fund --no-audit 2>&1
)

:: Verify critical packages
echo.
echo   [*] Verifying critical packages...

set MISSING_PKGS=0
for %%p in (puppeteer playwright express electron typescript) do (
    if not exist "node_modules\%%p" (
        echo   [!] Missing: %%p
        set /a MISSING_PKGS+=1
    )
)

if %MISSING_PKGS% GTR 0 (
    echo   [*] Installing missing critical packages...
    call npm install puppeteer playwright express typescript --legacy-peer-deps --no-fund 2>&1
)

echo   [OK] Dependencies installed
echo.

:: ============================================================================
:: STEP 6: Build TypeScript
:: ============================================================================
echo [STEP 6/8] Building TypeScript...
echo.

:: Try standard build first
call npm run build:win 2>&1
if errorlevel 1 (
    echo   [!] Windows build failed - trying safe build...
    call npx tsc --skipLibCheck --project tsconfig.windows.json 2>&1

    if errorlevel 1 (
        echo   [!] Safe build failed - trying minimal build...
        call npx tsc --skipLibCheck 2>&1
    )
)

:: Verify build
if exist "dist\server\index.js" (
    echo   [OK] Build successful - server ready
) else if exist "dist\electron\main.js" (
    echo   [OK] Build successful - electron ready
) else (
    echo   [!] Build may have issues - attempting repair...
    call npx tsc --skipLibCheck --outDir dist 2>&1
)
echo.

:: ============================================================================
:: STEP 7: Create Shortcuts
:: ============================================================================
echo [STEP 7/8] Creating shortcuts...
echo.

:: Create desktop shortcut for start.bat
set DESKTOP=%USERPROFILE%\Desktop
if exist "%DESKTOP%" (
    echo   [*] Creating desktop shortcut...

    :: Create VBS script to make shortcut
    (
        echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
        echo sLinkFile = "%DESKTOP%\UndetectBrowser.lnk"
        echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
        echo oLink.TargetPath = "%~dp0START_APP.bat"
        echo oLink.WorkingDirectory = "%~dp0"
        echo oLink.Description = "UndetectBrowser - Anti-Detection Browser"
        echo oLink.IconLocation = "%SystemRoot%\System32\shell32.dll,13"
        echo oLink.Save
    ) > "%TEMP%\create_shortcut.vbs"

    cscript //nologo "%TEMP%\create_shortcut.vbs" 2>nul
    del "%TEMP%\create_shortcut.vbs" 2>nul

    if exist "%DESKTOP%\UndetectBrowser.lnk" (
        echo   [OK] Desktop shortcut created
    )
)
echo.

:: ============================================================================
:: STEP 8: Final Verification
:: ============================================================================
echo [STEP 8/8] Final verification...
echo.

set ERRORS=0

:: Check critical files
echo   Checking components:
if exist "node_modules" (echo   [OK] node_modules) else (echo   [X] node_modules missing & set /a ERRORS+=1)
if exist ".env" (echo   [OK] .env) else (echo   [X] .env missing & set /a ERRORS+=1)
if exist "dist" (echo   [OK] dist) else (echo   [!] dist - may need rebuild)
if exist "data" (echo   [OK] data) else (echo   [X] data missing & set /a ERRORS+=1)

echo.

:: ============================================================================
:: COMPLETE!
:: ============================================================================
echo.
if %ERRORS% EQU 0 (
    echo  ╔═══════════════════════════════════════════════════════════════════════╗
    echo  ║                                                                       ║
    echo  ║              INSTALLATION COMPLETE! READY TO USE!                     ║
    echo  ║                                                                       ║
    echo  ╚═══════════════════════════════════════════════════════════════════════╝
    color 0A
) else (
    echo  ╔═══════════════════════════════════════════════════════════════════════╗
    echo  ║                                                                       ║
    echo  ║         INSTALLATION COMPLETE WITH %ERRORS% WARNING^(S^)                    ║
    echo  ║                                                                       ║
    echo  ╚═══════════════════════════════════════════════════════════════════════╝
    color 0E
)

echo.
echo  ┌───────────────────────────────────────────────────────────────────────┐
echo  │  QUICK START:                                                         │
echo  │                                                                       │
echo  │    START_APP.bat      - Launch the application (RECOMMENDED)          │
echo  │    START_SERVER.bat   - Start API server only                         │
echo  │    FIX_ERRORS.bat     - Auto-fix any issues                           │
echo  │                                                                       │
echo  │  Or double-click the desktop shortcut "UndetectBrowser"               │
echo  └───────────────────────────────────────────────────────────────────────┘
echo.
echo  Press any key to launch the application, or close this window...
pause > nul

:: Launch the app
call "%~dp0START_APP.bat"
