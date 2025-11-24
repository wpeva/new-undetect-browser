@echo off
chcp 65001 > nul
title UndetectBrowser - Build Installer
color 0D

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          UndetectBrowser Windows Installer Builder           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Check dependencies
if not exist "node_modules\" (
    echo [!] Installing dependencies...
    call npm install --legacy-peer-deps
)

echo [*] Building TypeScript...
call npm run build
if errorlevel 1 (
    echo [X] TypeScript build failed!
    pause
    exit /b 1
)

echo.
echo [*] Building Windows installer...
echo [*] This may take several minutes...
echo.

call npm run electron:build

if errorlevel 1 (
    echo.
    echo [X] Build failed!
    echo.
    echo Common issues:
    echo   1. Missing build resources - create build/icon.ico
    echo   2. Code signing issues - ignore for development
    echo.
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    Build Complete!                           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Installer location: release\
echo.

:: Open release folder
explorer release

pause
