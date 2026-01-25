@echo off
REM ============================================================================
REM UndetectBrowser - Python EXE Installer Builder
REM Automatic installer build via PyInstaller
REM ============================================================================

color 0B

echo.
echo ========================================================================
echo.
echo       UndetectBrowser - Python EXE Installer Builder
echo                    Version 1.0.0
echo.
echo ========================================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo.
    echo Python 3.7+ is required to build the installer
    echo.
    echo Download Python from the official website:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANT: Check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [1/3] Python found
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo       Version: %PYTHON_VERSION%
echo.

REM Check/install PyInstaller
echo [2/3] Checking PyInstaller...
python -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo       PyInstaller not found. Installing...
    python -m pip install pyinstaller
    if errorlevel 1 (
        echo [ERROR] Failed to install PyInstaller
        pause
        exit /b 1
    )
    echo       [OK] PyInstaller installed
) else (
    echo       [OK] PyInstaller already installed
)
echo.

REM Build installer
echo [3/3] Building installer...
echo       This may take 1-2 minutes...
echo.

python build_python_installer.py

if errorlevel 1 (
    echo.
    echo ========================================================================
    echo [ERROR] Build failed with errors
    echo ========================================================================
    pause
    exit /b 1
)

REM Success
echo.
echo ========================================================================
echo              [OK] INSTALLER SUCCESSFULLY CREATED!
echo ========================================================================
echo.

REM Check result
if exist "dist_installer\UndetectBrowser-Installer.exe" (
    for %%F in (dist_installer\UndetectBrowser-Installer.exe) do set SIZE=%%~zF
    set /a SIZE_MB=!SIZE! / 1048576

    echo File:    UndetectBrowser-Installer.exe
    echo Size:    %SIZE_MB% MB
    echo Folder:  dist_installer\
    echo.
    echo This exe file can be distributed!
    echo Users simply run it to install UndetectBrowser.
    echo.
    echo ========================================================================
    echo Contents of dist_installer:
    echo ========================================================================
    echo.
    dir /b dist_installer
    echo.
    echo ========================================================================
    echo.
    echo Open dist_installer folder? [Y/N]
    choice /C YN /M "Your choice"
    if errorlevel 2 goto :end
    if errorlevel 1 explorer dist_installer
) else (
    echo [ERROR] Installer not found after build!
)

:end
echo.
echo Press any key to exit...
pause >nul
