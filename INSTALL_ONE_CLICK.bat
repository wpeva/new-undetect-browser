@echo off
:: UndetectBrowser - One Click Installer
:: Автоматическая установка без консоли
title UndetectBrowser - One Click Installer
color 0B
mode con: cols=80 lines=30

cd /d "%~dp0"

:: Создаем папку для логов
if not exist "logs" mkdir logs
set LOGFILE=logs\install_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOGFILE=%LOGFILE: =0%

echo ================================================================
echo.
echo          UndetectBrowser - One Click Installer
echo          Автоматическая установка и настройка
echo.
echo ================================================================
echo.
echo  Процесс установки займет 3-5 минут
echo  Все будет установлено автоматически
echo.
echo  Логи: %LOGFILE%
echo.
echo ================================================================
echo.

:: Инициализация лога
echo ================================================================ > "%LOGFILE%"
echo   UndetectBrowser - One Click Installation >> "%LOGFILE%"
echo   Date: %date% %time% >> "%LOGFILE%"
echo ================================================================ >> "%LOGFILE%"
echo. >> "%LOGFILE%"

:: ============================================================================
:: ШАГ 1: Проверка Node.js
:: ============================================================================
echo [1/7] Проверка Node.js...
echo [1/7] Checking Node.js... >> "%LOGFILE%"

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo. >> "%LOGFILE%"
    echo ERROR: Node.js not found! >> "%LOGFILE%"
    echo.
    echo  ОШИБКА: Node.js не установлен!
    echo.
    echo  Необходимо установить Node.js 20 или выше
    echo  Открываю страницу загрузки...
    echo.
    start https://nodejs.org/
    echo  После установки Node.js:
    echo  1. Перезагрузите компьютер
    echo  2. Запустите этот файл снова
    echo.
    pause
    exit /b 1
)

node --version >> "%LOGFILE%" 2>&1
echo   ✓ Node.js установлен
echo   OK: Node.js installed >> "%LOGFILE%"
echo.

:: ============================================================================
:: ШАГ 2: Проверка npm
:: ============================================================================
echo [2/7] Проверка npm...
echo [2/7] Checking npm... >> "%LOGFILE%"

npm --version >> "%LOGFILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ОШИБКА: npm не найден!
    echo   ERROR: npm not found! >> "%LOGFILE%"
    pause
    exit /b 1
)

echo   ✓ npm доступен
echo   OK: npm available >> "%LOGFILE%"
echo.

:: ============================================================================
:: ШАГ 3: Очистка предыдущих установок (если есть)
:: ============================================================================
echo [3/7] Очистка старых файлов...
echo [3/7] Cleaning old files... >> "%LOGFILE%"

if exist "node_modules" (
    echo   Удаление старых node_modules...
    echo   Removing old node_modules... >> "%LOGFILE%"
    rmdir /s /q node_modules 2>> "%LOGFILE%"
)

if exist "dist" (
    echo   Удаление старого dist...
    echo   Removing old dist... >> "%LOGFILE%"
    rmdir /s /q dist 2>> "%LOGFILE%"
)

if exist "package-lock.json" (
    echo   Удаление package-lock.json...
    del /f /q package-lock.json 2>> "%LOGFILE%"
)

echo   ✓ Очистка завершена
echo   OK: Cleanup complete >> "%LOGFILE%"
echo.

:: ============================================================================
:: ШАГ 4: Создание необходимых папок
:: ============================================================================
echo [4/7] Создание папок проекта...
echo [4/7] Creating project folders... >> "%LOGFILE%"

mkdir data 2>nul
mkdir data\profiles 2>nul
mkdir data\sessions 2>nul
mkdir data\logs 2>nul
mkdir data\cache 2>nul
mkdir build 2>nul
mkdir logs 2>nul

echo   ✓ Папки созданы
echo   OK: Folders created >> "%LOGFILE%"
echo.

:: ============================================================================
:: ШАГ 5: Создание .env файла
:: ============================================================================
echo [5/7] Настройка конфигурации...
echo [5/7] Configuring environment... >> "%LOGFILE%"

if not exist ".env" (
    echo   Создание .env файла...
    (
        echo # UndetectBrowser - Auto Generated Configuration
        echo PORT=3000
        echo NODE_ENV=development
        echo HOST=0.0.0.0
        echo.
        echo # Security
        echo JWT_SECRET=change-this-secret-key-%RANDOM%%RANDOM%
        echo ENABLE_AUTH=false
        echo.
        echo # CORS
        echo CORS_ORIGIN=http://localhost:3001
        echo.
        echo # Browser Settings
        echo BROWSER_HEADLESS=false
        echo MAX_CONCURRENT_SESSIONS=10
        echo.
        echo # Database
        echo DB_PATH=./data/undetect.db
        echo.
        echo # Cloud Mode
        echo CLOUD_MODE=false
        echo.
        echo # Logs
        echo LOG_LEVEL=info
        echo LOG_PATH=./data/logs
    ) > .env
    echo   ✓ .env создан
    echo   OK: .env created >> "%LOGFILE%"
) else (
    echo   ✓ .env уже существует
    echo   OK: .env already exists >> "%LOGFILE%"
)
echo.

:: ============================================================================
:: ШАГ 6: Установка зависимостей
:: ============================================================================
echo [6/7] Установка зависимостей (3-5 минут)...
echo [6/7] Installing dependencies... >> "%LOGFILE%"
echo.
echo   Это может занять несколько минут...
echo   Пожалуйста, подождите...
echo.

echo   [6.1] Backend dependencies...
call npm install --legacy-peer-deps --loglevel=error 2>&1 >> "%LOGFILE%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   ОШИБКА при установке backend зависимостей!
    echo   ERROR: Backend dependencies installation failed! >> "%LOGFILE%"
    echo.
    echo   Проверьте лог: %LOGFILE%
    echo.
    pause
    exit /b 1
)
echo   ✓ Backend зависимости установлены

echo   [6.2] Frontend dependencies...
cd frontend
call npm install --loglevel=error 2>&1 >> "..\%LOGFILE%"
if %ERRORLEVEL% NEQ 0 (
    cd ..
    echo.
    echo   ОШИБКА при установке frontend зависимостей!
    echo   ERROR: Frontend dependencies installation failed! >> "%LOGFILE%"
    echo.
    echo   Проверьте лог: %LOGFILE%
    echo.
    pause
    exit /b 1
)
cd ..
echo   ✓ Frontend зависимости установлены
echo.

:: ============================================================================
:: ШАГ 7: Компиляция TypeScript
:: ============================================================================
echo [7/7] Компиляция проекта...
echo [7/7] Building project... >> "%LOGFILE%"

call npx tsc --skipLibCheck 2>&1 >> "%LOGFILE%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   ПРЕДУПРЕЖДЕНИЕ: Есть ошибки TypeScript
    echo   WARNING: TypeScript errors found >> "%LOGFILE%"
    echo.
    echo   Продолжаем, используя существующий код...
    echo.
)

echo   ✓ Компиляция завершена
echo   OK: Build complete >> "%LOGFILE%"
echo.

:: ============================================================================
:: ПРОВЕРКА РЕЗУЛЬТАТОВ
:: ============================================================================
echo.
echo ================================================================
echo                ПРОВЕРКА УСТАНОВКИ
echo ================================================================
echo.

set INSTALL_OK=1

if exist "node_modules\puppeteer" (
    echo  ✓ Backend dependencies
) else (
    echo  ✗ Backend dependencies - FAILED
    set INSTALL_OK=0
)

if exist "frontend\node_modules" (
    echo  ✓ Frontend dependencies
) else (
    echo  ✗ Frontend dependencies - FAILED
    set INSTALL_OK=0
)

if exist ".env" (
    echo  ✓ Configuration file
) else (
    echo  ✗ Configuration file - MISSING
    set INSTALL_OK=0
)

if exist "dist\server" (
    echo  ✓ TypeScript compiled
) else (
    echo  ✗ TypeScript compiled - FAILED
    set INSTALL_OK=0
)

echo.
echo ================================================================
echo. >> "%LOGFILE%"
echo Installation completed at %time% >> "%LOGFILE%"
echo ================================================================ >> "%LOGFILE%"

if %INSTALL_OK% EQU 0 (
    echo.
    echo  УСТАНОВКА ЗАВЕРШЕНА С ОШИБКАМИ!
    echo.
    echo  Проверьте лог: %LOGFILE%
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo              УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!
echo ================================================================
echo.
echo  Все компоненты установлены и настроены
echo.
echo  Для запуска используйте:
echo  • START_ONE_CLICK.vbs - Запуск без консоли (рекомендуется)
echo  • START_SIMPLE.bat     - Запуск с консолью
echo.
echo  Лог установки сохранен: %LOGFILE%
echo.
echo ================================================================
echo.

:: Создаем ярлык на рабочем столе (опционально)
set /p CREATE_SHORTCUT="Создать ярлык на рабочем столе? (Y/N): "
if /i "%CREATE_SHORTCUT%"=="Y" (
    echo.
    echo  Создание ярлыка...
    powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\UndetectBrowser.lnk'); $Shortcut.TargetPath = '%CD%\START_ONE_CLICK.vbs'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.Description = 'UndetectBrowser - Антидетект Браузер'; $Shortcut.Save()"
    echo  ✓ Ярлык создан на рабочем столе
    echo.
)

echo.
echo  Нажмите любую клавишу для запуска приложения...
pause >nul

:: Запускаем приложение
if exist "START_ONE_CLICK.vbs" (
    start "" "START_ONE_CLICK.vbs"
) else (
    start "" "START_SIMPLE.bat"
)

exit /b 0
