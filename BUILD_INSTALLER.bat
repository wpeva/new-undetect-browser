@echo off
REM ============================================================================
REM UndetectBrowser - Professional Installer Builder for Windows
REM Creates exe installer via Inno Setup
REM ============================================================================

setlocal enabledelayedexpansion

:: Colors (if supported)
color 0B

echo.
echo ========================================================================
echo.
echo           UndetectBrowser - Installer Builder
echo                      Version 1.0.0
echo.
echo ========================================================================
echo.

:: Check for Inno Setup
set "INNO_SETUP_NOT_FOUND=1"
set "ISCC_PATH="

:: Check standard Inno Setup installation paths
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" (
    set "ISCC_PATH=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
    set "INNO_SETUP_NOT_FOUND=0"
) else if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" (
    set "ISCC_PATH=%ProgramFiles%\Inno Setup 6\ISCC.exe"
    set "INNO_SETUP_NOT_FOUND=0"
) else if exist "%ProgramFiles(x86)%\Inno Setup 5\ISCC.exe" (
    set "ISCC_PATH=%ProgramFiles(x86)%\Inno Setup 5\ISCC.exe"
    set "INNO_SETUP_NOT_FOUND=0"
) else if exist "%ProgramFiles%\Inno Setup 5\ISCC.exe" (
    set "ISCC_PATH=%ProgramFiles%\Inno Setup 5\ISCC.exe"
    set "INNO_SETUP_NOT_FOUND=0"
)

if !INNO_SETUP_NOT_FOUND! == 1 (
    echo [ERROR] Inno Setup not found!
    echo.
    echo Inno Setup Compiler is not installed on this computer.
    echo.
    echo To create an installer, you need to install Inno Setup:
    echo.
    echo 1. Download Inno Setup from the official website:
    echo    https://jrsoftware.org/isdl.php
    echo.
    echo 2. Install Inno Setup Compiler
    echo.
    echo 3. Run this script again
    echo.
    echo Open download page? [Y/N]
    choice /C YN /M "Your choice"
    if errorlevel 2 goto :end
    if errorlevel 1 start https://jrsoftware.org/isdl.php
    goto :end
)

echo [1/6] Found Inno Setup: !ISCC_PATH!
echo.

:: Check for setup.iss
if not exist "setup.iss" (
    echo [ERROR] setup.iss not found!
    echo.
    echo The setup.iss file must be in the project root directory.
    goto :end
)

echo [2/6] Found setup.iss file
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js not found!
    echo Installer will be created, but requires Node.js on user's machine.
    echo.
) else (
    echo [3/6] Node.js installed
    echo.
)

:: Check and install dependencies (optional)
echo [4/6] Checking dependencies...
if not exist "node_modules\" (
    echo Dependencies not installed. Install now? [Y/N]
    choice /C YN /M "Your choice"
    if errorlevel 2 goto :skip_deps
    if errorlevel 1 (
        echo Installing dependencies...
        call npm install --legacy-peer-deps
        if errorlevel 1 (
            echo [WARNING] Error installing dependencies
        ) else (
            echo Dependencies installed
        )
    )
) else (
    echo Dependencies already installed
)
:skip_deps
echo.

:: Compile TypeScript (optional)
echo [5/6] Checking project build...
if not exist "dist\" (
    echo Project not built. Build now? [Y/N]
    choice /C YN /M "Your choice"
    if errorlevel 2 goto :skip_build
    if errorlevel 1 (
        echo Compiling TypeScript...
        call npm run build:safe
        if errorlevel 1 (
            echo [WARNING] Compilation errors
        ) else (
            echo Project built successfully
        )
    )
) else (
    echo Project already built
)
:skip_build
echo.

:: Create icons directory (if needed)
if not exist "build\" mkdir build

:: Create default icon (if missing)
if not exist "build\icon.ico" (
    echo [INFO] Creating default icon...
    :: Can copy standard Windows icon or create your own
    :: For production - replace with your own icon!
)

:: Compile installer
echo.
echo ========================================================================
echo [6/6] Compiling installer...
echo ========================================================================
echo.
echo This may take several minutes...
echo.

"!ISCC_PATH!" setup.iss

if errorlevel 1 (
    echo.
    echo ========================================================================
    echo [ERROR] Compilation failed with errors!
    echo ========================================================================
    echo.
    echo Check:
    echo 1. All paths in setup.iss are correct
    echo 2. All required files are present
    echo 3. LICENSE file exists (if specified in setup.iss)
    echo 4. Icons exist in build\ folder
    echo.
    pause
    goto :end
)

:: Check result
if exist "Output\*.exe" (
    echo.
    echo ========================================================================
    echo              INSTALLER SUCCESSFULLY CREATED!
    echo ========================================================================
    echo.

    for %%F in (Output\*.exe) do (
        set "INSTALLER_NAME=%%~nxF"
        set "INSTALLER_SIZE=%%~zF"

        :: Convert size to MB
        set /a "SIZE_MB=!INSTALLER_SIZE! / 1048576"

        echo File:    !INSTALLER_NAME!
        echo Size:    !SIZE_MB! MB
        echo Path:    %%~fF
        echo.
    )

    echo Installer ready for distribution!
    echo.
    echo Open installer folder? [Y/N]
    choice /C YN /M "Your choice"
    if errorlevel 2 goto :show_next_steps
    if errorlevel 1 explorer Output

    :show_next_steps
    echo.
    echo ========================================================================
    echo Next steps:
    echo ========================================================================
    echo.
    echo 1. Test the installer on a clean system
    echo 2. Verify all features work correctly
    echo 3. Create README for users
    echo 4. Optional: sign .exe with digital signature
    echo.
    echo To sign, use SignTool.exe from Windows SDK:
    echo signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com Output\!INSTALLER_NAME!
    echo.

) else (
    echo.
    echo [ERROR] Installer not found in Output\ folder
    echo.
)

:end
echo.
echo Press any key to exit...
pause >nul
