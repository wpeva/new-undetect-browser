@echo off
REM ============================================================================
REM UndetectBrowser - Professional Installer Builder for Windows
REM Создаёт exe установщик через Inno Setup
REM ============================================================================

setlocal enabledelayedexpansion

:: Цвета (если поддерживаются)
color 0B

echo.
echo ========================================================================
echo.
echo           UndetectBrowser - Installer Builder
echo                      Version 1.0.0
echo.
echo ========================================================================
echo.

:: Проверка наличия Inno Setup
set "INNO_SETUP_NOT_FOUND=1"
set "ISCC_PATH="

:: Проверяем стандартные пути установки Inno Setup
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
    echo [ОШИБКА] Inno Setup не найден!
    echo.
    echo Inno Setup Compiler не установлен на этом компьютере.
    echo.
    echo Для создания установщика необходимо установить Inno Setup:
    echo.
    echo 1. Скачайте Inno Setup с официального сайта:
    echo    https://jrsoftware.org/isdl.php
    echo.
    echo 2. Установите Inno Setup Compiler
    echo.
    echo 3. Запустите этот скрипт снова
    echo.
    echo Открыть страницу загрузки? [Y/N]
    choice /C YN /M "Ваш выбор"
    if errorlevel 2 goto :end
    if errorlevel 1 start https://jrsoftware.org/isdl.php
    goto :end
)

echo [1/6] Найден Inno Setup: !ISCC_PATH!
echo.

:: Проверка наличия setup.iss
if not exist "setup.iss" (
    echo [ОШИБКА] setup.iss не найден!
    echo.
    echo Файл setup.iss должен находиться в корневой директории проекта.
    goto :end
)

echo [2/6] Файл setup.iss найден
echo.

:: Проверка Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Node.js не найден!
    echo Установщик будет создан, но требует Node.js на машине пользователя.
    echo.
) else (
    echo [3/6] Node.js установлен
    echo.
)

:: Проверка и установка зависимостей (опционально)
echo [4/6] Проверка зависимостей...
if not exist "node_modules\" (
    echo Зависимости не установлены. Установить сейчас? [Y/N]
    choice /C YN /M "Ваш выбор"
    if errorlevel 2 goto :skip_deps
    if errorlevel 1 (
        echo Устанавливаем зависимости...
        call npm install --legacy-peer-deps
        if errorlevel 1 (
            echo [ПРЕДУПРЕЖДЕНИЕ] Ошибка установки зависимостей
        ) else (
            echo Зависимости установлены
        )
    )
) else (
    echo Зависимости уже установлены
)
:skip_deps
echo.

:: Компиляция TypeScript (опционально)
echo [5/6] Проверка сборки проекта...
if not exist "dist\" (
    echo Проект не собран. Собрать сейчас? [Y/N]
    choice /C YN /M "Ваш выбор"
    if errorlevel 2 goto :skip_build
    if errorlevel 1 (
        echo Компилируем TypeScript...
        call npm run build:safe
        if errorlevel 1 (
            echo [ПРЕДУПРЕЖДЕНИЕ] Ошибки компиляции
        ) else (
            echo Проект успешно собран
        )
    )
) else (
    echo Проект уже собран
)
:skip_build
echo.

:: Создание директории для иконок (если нужно)
if not exist "build\" mkdir build

:: Создание иконки по умолчанию (если отсутствует)
if not exist "build\icon.ico" (
    echo [INFO] Создаём иконку по умолчанию...
    :: Можно скопировать стандартную иконку Windows или создать свою
    :: Для production - замените на свою иконку!
)

:: Компиляция установщика
echo.
echo ========================================================================
echo [6/6] Компиляция установщика...
echo ========================================================================
echo.
echo Это может занять несколько минут...
echo.

"!ISCC_PATH!" setup.iss

if errorlevel 1 (
    echo.
    echo ========================================================================
    echo [ОШИБКА] Компиляция завершилась с ошибками!
    echo ========================================================================
    echo.
    echo Проверьте:
    echo 1. Все пути в setup.iss корректны
    echo 2. Все необходимые файлы присутствуют
    echo 3. Файл LICENSE существует (если указан в setup.iss)
    echo 4. Иконки существуют в папке build\
    echo.
    pause
    goto :end
)

:: Проверка результата
if exist "Output\*.exe" (
    echo.
    echo ========================================================================
    echo              УСТАНОВЩИК УСПЕШНО СОЗДАН!
    echo ========================================================================
    echo.

    for %%F in (Output\*.exe) do (
        set "INSTALLER_NAME=%%~nxF"
        set "INSTALLER_SIZE=%%~zF"

        :: Конвертируем размер в MB
        set /a "SIZE_MB=!INSTALLER_SIZE! / 1048576"

        echo Файл:    !INSTALLER_NAME!
        echo Размер:  !SIZE_MB! MB
        echo Путь:    %%~fF
        echo.
    )

    echo Установщик готов к распространению!
    echo.
    echo Открыть папку с установщиком? [Y/N]
    choice /C YN /M "Ваш выбор"
    if errorlevel 2 goto :show_next_steps
    if errorlevel 1 explorer Output

    :show_next_steps
    echo.
    echo ========================================================================
    echo Следующие шаги:
    echo ========================================================================
    echo.
    echo 1. Протестируйте установщик на чистой системе
    echo 2. Проверьте, что все функции работают корректно
    echo 3. Создайте README для пользователей
    echo 4. Опционально: подпишите .exe цифровой подписью
    echo.
    echo Для подписи используйте SignTool.exe из Windows SDK:
    echo signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com Output\!INSTALLER_NAME!
    echo.

) else (
    echo.
    echo [ОШИБКА] Установщик не найден в папке Output\
    echo.
)

:end
echo.
echo Нажмите любую клавишу для выхода...
pause >nul
