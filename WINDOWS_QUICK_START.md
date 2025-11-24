# UndetectBrowser - Быстрый старт для Windows 10/11

## Требования

- Windows 10/11 (64-bit)
- Node.js 18 или выше ([скачать](https://nodejs.org/))
- 4 GB RAM минимум (рекомендуется 8 GB)
- 2 GB свободного места на диске

## Быстрая установка (один клик)

### Вариант 1: Через BAT файл

1. Скачайте или клонируйте репозиторий
2. Откройте папку проекта
3. Дважды кликните на файл `install.bat`
4. Дождитесь завершения установки

### Вариант 2: Через PowerShell (рекомендуется)

1. Откройте PowerShell от имени администратора
2. Перейдите в папку проекта:
   ```powershell
   cd C:\путь\к\new-undetect-browser
   ```
3. Запустите установку:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   .\scripts\windows\install.ps1
   ```

## Запуск приложения

### GUI (Десктопное приложение)

Дважды кликните на `start.bat` или выполните:
```bash
npm run electron
```

### API Сервер

Дважды кликните на `start-server.bat` или выполните:
```bash
npm run server:v2
```

Сервер будет доступен на: http://localhost:3000

### Режим разработки

Дважды кликните на `start-dev.bat` или выполните:
```bash
npm run electron:dev
```

## Сборка установщика

Для создания установщика Windows (.exe):

```bash
npm run electron:build
```

Установщик будет в папке `release/`

## Автоматическое исправление проблем

Если что-то не работает, запустите:

```bash
npm run fix
```

Или через PowerShell:
```powershell
.\scripts\windows\fix-issues.ps1
```

## Проверка состояния проекта

```bash
npm run health
```

## Частые проблемы и решения

### "node" не распознается как команда

**Решение:** Установите Node.js с [nodejs.org](https://nodejs.org/) и перезапустите терминал.

### Ошибки при установке bcrypt/sqlite3

**Решение:** Установите Visual Studio Build Tools:
```powershell
npm install --global windows-build-tools
```

### Браузер не запускается

**Решения:**
1. Установите Google Chrome
2. Или позвольте Puppeteer скачать свой браузер:
   ```bash
   npx puppeteer browsers install chrome
   ```

### Порт 3000 занят

**Решение:** Найдите и завершите процесс:
```powershell
netstat -ano | findstr :3000
taskkill /PID <номер_процесса> /F
```

### Ошибки доступа к файлам

**Решения:**
1. Запустите от имени администратора
2. Добавьте папку проекта в исключения антивируса
3. Отключите Windows Defender для папки проекта:
   ```powershell
   Add-MpPreference -ExclusionPath "C:\путь\к\проекту"
   ```

### TypeScript не компилируется

**Решение:**
```bash
npm run build:safe
```

## Структура проекта

```
new-undetect-browser/
├── start.bat              # Запуск GUI
├── start-server.bat       # Запуск сервера
├── start-dev.bat          # Режим разработки
├── build.bat              # Сборка установщика
├── install.bat            # Установка зависимостей
├── scripts/
│   └── windows/
│       ├── install.ps1    # PowerShell установщик
│       └── fix-issues.ps1 # Автоисправление
├── src/                   # Исходный код
├── server/                # API сервер
├── electron/              # Desktop приложение
├── data/                  # Данные и профили
└── dist/                  # Скомпилированный код
```

## Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run electron` | Запустить GUI |
| `npm run server` | Запустить сервер |
| `npm run build` | Скомпилировать TypeScript |
| `npm run test` | Запустить тесты |
| `npm run health` | Проверить состояние |
| `npm run fix` | Исправить проблемы |
| `npm run clean` | Очистить build |
| `npm run electron:build` | Собрать установщик |

## Конфигурация

Основные настройки в файле `.env`:

```env
# Порт сервера
PORT=3000

# Режим работы
NODE_ENV=development

# Путь к Chrome (опционально)
CHROME_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe

# База данных
DB_PATH=./data/undetect.db

# Уровень логирования
LOG_LEVEL=info
```

## Поддержка

- Документация: [README.md](./README.md)
- Проблемы: создайте Issue в репозитории
- Запуск диагностики: `npm run health`

## Обновление

```bash
git pull
npm install --legacy-peer-deps
npm run build
```

---

**Версия:** 1.0.0
**Платформа:** Windows 10/11 (64-bit)
**Node.js:** 18+
