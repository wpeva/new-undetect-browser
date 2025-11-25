# UndetectBrowser - Инструкция по установке для Windows 10

## Что это такое?

UndetectBrowser - это продвинутый антидетект браузер с открытым исходным кодом, аналог платных решений Multilogin, AdsPower и GoLogin. Позволяет создавать уникальные браузерные профили с разными отпечатками для работы с несколькими аккаунтами.

---

## БЫСТРАЯ УСТАНОВКА (5 минут)

### Шаг 1: Установите Node.js

1. Скачайте Node.js с официального сайта: **https://nodejs.org/**
2. Выберите версию **LTS** (зеленая кнопка)
3. Запустите скачанный файл `node-vXX.X.X-x64.msi`
4. При установке **ОБЯЗАТЕЛЬНО** поставьте галочку:
   - ✅ "Add to PATH" (Добавить в PATH)
   - ✅ "Automatically install necessary tools" (если есть)
5. Нажмите "Next" → "Install" → "Finish"
6. **Перезагрузите компьютер** после установки

### Шаг 2: Скачайте проект

**Вариант A - через Git (рекомендуется):**
1. Установите Git: https://git-scm.com/download/win
2. Откройте PowerShell или CMD и выполните:
```
git clone https://github.com/ваш-репозиторий/new-undetect-browser.git
cd new-undetect-browser
```

**Вариант B - ZIP архив:**
1. Скачайте ZIP архив с репозитория
2. Распакуйте в папку `C:\UndetectBrowser\` (или любую без русских букв)

### Шаг 3: Запустите установку

1. Откройте папку с проектом
2. **Дважды кликните** на файл `INSTALL_WINDOWS.bat`
3. Дождитесь завершения (3-5 минут)
4. Готово!

### Шаг 4: Запустите приложение

**Дважды кликните** на `START_APP.bat` и выберите режим:
- **[1] Desktop App** - графический интерфейс
- **[2] Server** - API сервер на http://localhost:3000
- **[3] Development** - режим разработки

---

## ПОДРОБНАЯ УСТАНОВКА (если автоматическая не сработала)

### 1. Проверка Node.js

Откройте PowerShell (Win + X → PowerShell) и выполните:
```powershell
node --version
npm --version
```

Должны увидеть версии, например:
```
v20.10.0
10.2.0
```

Если команда не найдена - установите Node.js заново и перезагрузитесь.

### 2. Установка зависимостей вручную

Откройте PowerShell в папке проекта и выполните:
```powershell
npm install --legacy-peer-deps
```

Если есть ошибки:
```powershell
npm install --legacy-peer-deps --ignore-optional
```

### 3. Сборка проекта

```powershell
npm run build:win
```

Если есть ошибки TypeScript:
```powershell
npx tsc --skipLibCheck
```

### 4. Запуск

**Сервер:**
```powershell
npm run server:v2
```

**Desktop приложение:**
```powershell
npm run electron
```

---

## РЕШЕНИЕ ЧАСТЫХ ПРОБЛЕМ

### "node" не является внутренней командой

**Решение:**
1. Переустановите Node.js
2. При установке выберите "Add to PATH"
3. Перезагрузите компьютер

### Ошибка при npm install

**Решение:**
```powershell
npm cache clean --force
npm install --legacy-peer-deps --ignore-optional
```

### Ошибки TypeScript при сборке

**Решение:**
```powershell
npm run build:safe
```

Или:
```powershell
npx tsc --skipLibCheck
```

### Порт 3000 занят

**Решение:**
1. Откройте PowerShell от администратора
2. Найдите процесс:
```powershell
netstat -ano | findstr :3000
```
3. Завершите процесс (замените XXXX на PID из предыдущей команды):
```powershell
taskkill /PID XXXX /F
```

### Puppeteer не находит браузер

**Решение A - использовать системный Chrome:**
1. Установите Google Chrome
2. Откройте файл `.env`
3. Добавьте строку:
```
PUPPETEER_EXECUTABLE_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe
```

**Решение B - скачать встроенный Chromium:**
```powershell
npx puppeteer browsers install chrome
```

### Антивирус блокирует установку

**Решение:**
1. Временно отключите антивирус
2. Добавьте папку проекта в исключения
3. Запустите установку заново

### Ошибки с bcrypt или sqlite3

Эти пакеты требуют компиляции. Установите Visual Studio Build Tools:

1. Скачайте: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. При установке выберите "Desktop development with C++"
3. Перезагрузите компьютер
4. Запустите:
```powershell
npm rebuild
```

---

## СТРУКТУРА ФАЙЛОВ

```
new-undetect-browser/
├── INSTALL_WINDOWS.bat    # Установка (запустите первым!)
├── START_APP.bat          # Запуск приложения
├── START_SERVER.bat       # Только API сервер
├── FIX_ERRORS.bat         # Автоматическое исправление ошибок
├── .env                   # Настройки (создается автоматически)
├── data/                  # Данные и профили
│   ├── profiles/          # Браузерные профили
│   ├── sessions/          # Сессии
│   └── logs/              # Логи
├── dist/                  # Скомпилированный код
└── node_modules/          # Зависимости
```

---

## ИСПОЛЬЗОВАНИЕ

### Запуск сервера

1. Запустите `START_SERVER.bat`
2. Откройте браузер: http://localhost:3000
3. Сервер готов к работе!

### API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /health | Проверка статуса |
| GET | /api/profiles | Список профилей |
| POST | /api/profiles | Создать профиль |
| POST | /api/sessions | Запустить браузер |
| DELETE | /api/sessions/:id | Закрыть браузер |

### Пример: Создание профиля через API

```javascript
// Создать профиль
fetch('http://localhost:3000/api/profiles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Мой профиль',
    proxy: {
      host: 'proxy.example.com',
      port: 8080,
      username: 'user',
      password: 'pass'
    }
  })
});
```

---

## КОМАНДЫ NPM

| Команда | Описание |
|---------|----------|
| `npm run start` | Быстрый запуск с авто-проверкой |
| `npm run server:v2` | Запуск API сервера |
| `npm run electron` | Запуск Desktop приложения |
| `npm run fix` | Автоматическое исправление проблем |
| `npm run doctor` | Диагностика без исправлений |
| `npm run build:win` | Сборка для Windows |
| `npm run test` | Запуск тестов |

---

## АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ ОШИБОК

Если что-то пошло не так:

1. Запустите `FIX_ERRORS.bat`
2. Или выполните в PowerShell:
```powershell
npm run fix
```

Скрипт автоматически:
- Проверит и установит зависимости
- Создаст необходимые папки
- Пересоберет TypeScript
- Исправит конфигурацию
- Проверит доступность портов

---

## ПОДДЕРЖКА

При возникновении проблем:

1. Сначала запустите `FIX_ERRORS.bat`
2. Проверьте логи в папке `data/logs/`
3. Создайте issue на GitHub с описанием:
   - Версия Windows
   - Версия Node.js (`node --version`)
   - Текст ошибки
   - Шаги для воспроизведения

---

## ОБНОВЛЕНИЕ

```powershell
git pull
npm install --legacy-peer-deps
npm run build:win
```

---

**Удачной работы с UndetectBrowser!**
