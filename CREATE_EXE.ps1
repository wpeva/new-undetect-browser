# UndetectBrowser - Автоматическое создание EXE инсталлера
# PowerShell скрипт для автоматизации сборки

param(
    [string]$Method = "innosetup",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Цвета для вывода
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Логотип
function Show-Banner {
    Write-ColorOutput @"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          UndetectBrowser - EXE Installer Builder               ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -Color Cyan
}

# Помощь
function Show-Help {
    Write-ColorOutput @"

ИСПОЛЬЗОВАНИЕ:
    .\CREATE_EXE.ps1 [-Method <метод>] [-Help]

МЕТОДЫ:
    innosetup     - Создать установщик через Inno Setup (рекомендуется)
    electron      - Создать standalone Electron приложение
    both          - Создать оба варианта

ПРИМЕРЫ:
    .\CREATE_EXE.ps1 -Method innosetup
    .\CREATE_EXE.ps1 -Method electron
    .\CREATE_EXE.ps1 -Method both

ТРЕБОВАНИЯ:
    - Node.js 20+
    - npm
    - Для innosetup: Inno Setup Compiler
    - Для electron: Установленные зависимости

"@ -Color Yellow
}

# Проверка Node.js
function Test-NodeJS {
    Write-ColorOutput "`n[1/7] Проверка Node.js..." -Color Yellow

    try {
        $nodeVersion = node --version
        Write-ColorOutput "  ✓ Node.js установлен: $nodeVersion" -Color Green
        return $true
    }
    catch {
        Write-ColorOutput "  ✗ Node.js не найден!" -Color Red
        Write-ColorOutput "  Установите Node.js с https://nodejs.org/" -Color Yellow
        return $false
    }
}

# Проверка npm
function Test-Npm {
    Write-ColorOutput "`n[2/7] Проверка npm..." -Color Yellow

    try {
        $npmVersion = npm --version
        Write-ColorOutput "  ✓ npm установлен: $npmVersion" -Color Green
        return $true
    }
    catch {
        Write-ColorOutput "  ✗ npm не найден!" -Color Red
        return $false
    }
}

# Проверка зависимостей
function Test-Dependencies {
    Write-ColorOutput "`n[3/7] Проверка зависимостей..." -Color Yellow

    if (Test-Path "node_modules") {
        Write-ColorOutput "  ✓ node_modules найдены" -Color Green
        return $true
    }
    else {
        Write-ColorOutput "  ! node_modules не найдены" -Color Yellow
        Write-ColorOutput "  Запуск npm install..." -Color Yellow

        npm install --legacy-peer-deps

        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✓ Зависимости установлены" -Color Green
            return $true
        }
        else {
            Write-ColorOutput "  ✗ Ошибка установки зависимостей" -Color Red
            return $false
        }
    }
}

# Компиляция TypeScript
function Build-TypeScript {
    Write-ColorOutput "`n[4/7] Компиляция TypeScript..." -Color Yellow

    npm run build:safe

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✓ TypeScript скомпилирован" -Color Green
        return $true
    }
    else {
        Write-ColorOutput "  ! Есть ошибки TypeScript, но продолжаем..." -Color Yellow
        return $true
    }
}

# Создание установщика через Inno Setup
function Build-InnoSetup {
    Write-ColorOutput "`n[5/7] Создание Inno Setup установщика..." -Color Yellow

    # Проверка наличия Inno Setup
    $innoSetupPaths = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 5\ISCC.exe"
    )

    $iscc = $null
    foreach ($path in $innoSetupPaths) {
        if (Test-Path $path) {
            $iscc = $path
            break
        }
    }

    if (-not $iscc) {
        Write-ColorOutput "  ✗ Inno Setup не найден!" -Color Red
        Write-ColorOutput "  Скачайте с: https://jrsoftware.org/isdl.php" -Color Yellow
        return $false
    }

    Write-ColorOutput "  ✓ Inno Setup найден: $iscc" -Color Green

    # Проверка наличия setup.iss
    if (-not (Test-Path "setup.iss")) {
        Write-ColorOutput "  ✗ setup.iss не найден!" -Color Red
        return $false
    }

    # Компиляция
    Write-ColorOutput "  Компиляция установщика..." -Color Yellow
    & $iscc "setup.iss" /Q

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✓ Установщик создан!" -Color Green

        # Проверка результата
        if (Test-Path "Output\*.exe") {
            $installer = Get-ChildItem "Output\*.exe" | Select-Object -First 1
            Write-ColorOutput "`n  📦 Установщик: $($installer.FullName)" -Color Cyan
            Write-ColorOutput "  📊 Размер: $([math]::Round($installer.Length / 1MB, 2)) MB" -Color Cyan
            return $true
        }
    }
    else {
        Write-ColorOutput "  ✗ Ошибка компиляции" -Color Red
        return $false
    }

    return $false
}

# Создание Electron приложения
function Build-Electron {
    Write-ColorOutput "`n[6/7] Создание Electron приложения..." -Color Yellow

    # Проверка frontend зависимостей
    if (-not (Test-Path "frontend\node_modules")) {
        Write-ColorOutput "  Установка frontend зависимостей..." -Color Yellow
        Push-Location frontend
        npm install
        Pop-Location
    }

    # Сборка Electron
    Write-ColorOutput "  Сборка Electron (это может занять 5-10 минут)..." -Color Yellow
    npm run electron:build

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✓ Electron приложение создано!" -Color Green

        # Проверка результата
        if (Test-Path "release\*.exe") {
            $apps = Get-ChildItem "release\*.exe"
            foreach ($app in $apps) {
                Write-ColorOutput "`n  📦 Приложение: $($app.Name)" -Color Cyan
                Write-ColorOutput "  📊 Размер: $([math]::Round($app.Length / 1MB, 2)) MB" -Color Cyan
            }
            return $true
        }
    }
    else {
        Write-ColorOutput "  ✗ Ошибка сборки Electron" -Color Red
        return $false
    }

    return $false
}

# Создание readme для установщика
function Create-InstallerReadme {
    Write-ColorOutput "`n[7/7] Создание README..." -Color Yellow

    $readme = @"
# UndetectBrowser Installer

## Установочные файлы

### Inno Setup Installer (Рекомендуется)
- **Файл:** Output\UndetectBrowser-Setup-1.0.0.exe
- **Размер:** ~5-10 MB
- **Описание:** Полноценный установщик для Windows
- **Требует:** Node.js 20+ на компьютере пользователя

**Установка:**
1. Запустите UndetectBrowser-Setup-1.0.0.exe
2. Следуйте инструкциям установщика
3. После установки запустится автоматическая установка зависимостей
4. Готово!

---

### Electron Standalone (Полное приложение)
- **Файл:** release\UndetectBrowser Setup 1.0.0.exe
- **Размер:** ~150-200 MB
- **Описание:** Полностью автономное приложение
- **Требует:** Ничего! Все включено

**Установка:**
1. Запустите "UndetectBrowser Setup 1.0.0.exe"
2. Готово!

---

## Системные требования

- Windows 10/11 (64-bit)
- 4 GB RAM (рекомендуется 8 GB)
- 2 GB свободного места на диске
- Node.js 20+ (только для Inno Setup версии)

---

## Поддержка

Если возникли проблемы:
1. Проверьте, что Node.js 20+ установлен
2. Запустите от имени администратора
3. Добавьте в исключения антивируса
4. Проверьте логи в папке logs/

---

Дата сборки: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

    $readme | Out-File -FilePath "INSTALLER_README.txt" -Encoding UTF8
    Write-ColorOutput "  ✓ README создан: INSTALLER_README.txt" -Color Green
}

# Главная функция
function Main {
    Show-Banner

    if ($Help) {
        Show-Help
        return
    }

    Write-ColorOutput "`nНачало сборки установщика..." -Color Cyan
    Write-ColorOutput "Метод: $Method`n" -Color Cyan

    # Проверки
    if (-not (Test-NodeJS)) { return }
    if (-not (Test-Npm)) { return }
    if (-not (Test-Dependencies)) { return }
    if (-not (Build-TypeScript)) { return }

    # Сборка
    $success = $false

    switch ($Method.ToLower()) {
        "innosetup" {
            $success = Build-InnoSetup
        }
        "electron" {
            $success = Build-Electron
        }
        "both" {
            $innoSuccess = Build-InnoSetup
            $electronSuccess = Build-Electron
            $success = $innoSuccess -or $electronSuccess
        }
        default {
            Write-ColorOutput "`n✗ Неизвестный метод: $Method" -Color Red
            Write-ColorOutput "Используйте: innosetup, electron, или both" -Color Yellow
            Show-Help
            return
        }
    }

    # Создание README
    if ($success) {
        Create-InstallerReadme

        Write-ColorOutput @"

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                  ✓ Сборка завершена успешно!                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

"@ -Color Green

        Write-ColorOutput "Установочные файлы готовы к распространению!" -Color Cyan
        Write-ColorOutput "`nПроверьте папки:" -Color Yellow
        Write-ColorOutput "  • Output\        - Inno Setup установщик" -Color White
        Write-ColorOutput "  • release\       - Electron приложение" -Color White
        Write-ColorOutput "  • INSTALLER_README.txt - Инструкции`n" -Color White
    }
    else {
        Write-ColorOutput @"

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                  ✗ Сборка завершена с ошибками                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

"@ -Color Red

        Write-ColorOutput "Проверьте логи и исправьте ошибки`n" -Color Yellow
    }
}

# Запуск
Main
