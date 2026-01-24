@echo off
REM ============================================================================
REM UndetectBrowser - Создание Python EXE установщика
REM Автоматическая сборка установщика через PyInstaller
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

REM Проверка Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python не найден!
    echo.
    echo Для сборки установщика требуется Python 3.7+
    echo.
    echo Скачайте Python с официального сайта:
    echo https://www.python.org/downloads/
    echo.
    echo ВАЖНО: При установке отметьте "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo [1/3] Python найден
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo       Версия: %PYTHON_VERSION%
echo.

REM Проверка/установка PyInstaller
echo [2/3] Проверка PyInstaller...
python -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo       PyInstaller не найден. Устанавливаю...
    python -m pip install pyinstaller
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить PyInstaller
        pause
        exit /b 1
    )
    echo       ✓ PyInstaller установлен
) else (
    echo       ✓ PyInstaller уже установлен
)
echo.

REM Сборка установщика
echo [3/3] Сборка установщика...
echo       Это может занять 1-2 минуты...
echo.

python build_python_installer.py

if errorlevel 1 (
    echo.
    echo ========================================================================
    echo [ОШИБКА] Сборка завершилась с ошибками
    echo ========================================================================
    pause
    exit /b 1
)

REM Успех
echo.
echo ========================================================================
echo              ✓ УСТАНОВЩИК УСПЕШНО СОЗДАН!
echo ========================================================================
echo.

REM Проверяем результат
if exist "dist_installer\UndetectBrowser-Installer.exe" (
    for %%F in (dist_installer\UndetectBrowser-Installer.exe) do set SIZE=%%~zF
    set /a SIZE_MB=!SIZE! / 1048576

    echo Файл:    UndetectBrowser-Installer.exe
    echo Размер:  %SIZE_MB% MB
    echo Папка:   dist_installer\
    echo.
    echo Этот exe файл можно распространять!
    echo Пользователи просто запускают его для установки UndetectBrowser.
    echo.
    echo ========================================================================
    echo Содержимое dist_installer:
    echo ========================================================================
    echo.
    dir /b dist_installer
    echo.
    echo ========================================================================
    echo.
    echo Открыть папку dist_installer? [Y/N]
    choice /C YN /M "Ваш выбор"
    if errorlevel 2 goto :end
    if errorlevel 1 explorer dist_installer
) else (
    echo [ОШИБКА] Установщик не найден после сборки!
)

:end
echo.
echo Нажмите любую клавишу для выхода...
pause >nul
