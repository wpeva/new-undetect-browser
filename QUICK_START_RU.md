# ⚡ БЫСТРЫЙ СТАРТ - Антидетект Браузер

## 🎯 За 5 минут на домашнем ПК

### 1️⃣ Установите Node.js
Скачайте с https://nodejs.org/ (версия 18 или выше)

### 2️⃣ Установите зависимости
```bash
npm install
cd frontend && npm install && cd ..
```

### 3️⃣ Соберите проект
```bash
npm run build
```

### 4️⃣ Запустите (2 окна терминала)

**Окно 1 - Backend:**
```bash
npm run server
```

**Окно 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5️⃣ Откройте браузер
→ http://localhost:3001

---

## 🐳 Docker (альтернатива)

```bash
docker build -t undetect-browser .
docker run -p 3000:3000 undetect-browser
```

→ http://localhost:3000

---

## 📦 Команды

### Разработка
```bash
npm run server:dev      # Backend с авто-перезагрузкой
npm run dev             # Frontend с авто-перезагрузкой
```

### Production
```bash
cd frontend && npm run build && cd ..
NODE_ENV=production npm run server
```

### Тесты
```bash
npm test                # Все тесты
npm run test:detection  # Тесты антидетекта
npm run test:e2e        # E2E тесты
```

### Линтинг и форматирование
```bash
npm run lint            # Проверка кода
npm run lint:fix        # Исправить ошибки
npm run format          # Форматировать код
```

---

## 🎨 Что вы увидите

После запуска откроется веб-панель с:

✅ **Dashboard** - статистика и быстрые действия
✅ **Profiles** - управление профилями браузеров
✅ **Proxies** - управление прокси-серверами
✅ **Automation** - задачи автоматизации
✅ **Settings** - настройки

---

## 🚀 Первые шаги

1. **Создайте профиль браузера**
   - Нажмите "Create Profile"
   - Введите имя профиля
   - Настройте параметры (или оставьте автоматические)
   - Сохраните

2. **Добавьте прокси (опционально)**
   - Перейдите в Proxies
   - Нажмите "Add Proxy"
   - Введите данные прокси
   - Тестируйте соединение

3. **Запустите браузер**
   - Выберите профиль
   - Нажмите "Launch"
   - Браузер откроется с антидетект защитой!

---

## 📊 Проверка антидетекта

Откройте в запущенном браузере:
- https://bot.sannysoft.com
- https://pixelscan.net
- https://abrahamjuliot.github.io/creepjs/

Все тесты должны показывать: **НЕ БОТ** ✅

---

## 💻 API примеры

### Создать профиль
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Profile",
    "userAgent": "Mozilla/5.0..."
  }'
```

### Получить список профилей
```bash
curl http://localhost:3000/api/profiles
```

### Запустить профиль
```bash
curl -X POST http://localhost:3000/api/profiles/{id}/launch
```

---

## 🛠️ Автоматизация с кодом

### Puppeteer
```javascript
const { UndetectBrowser } = require('./dist');

const browser = new UndetectBrowser({
  profileId: 'my-profile',
  stealth: true
});

await browser.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
```

### Playwright
```javascript
const { chromium } = require('playwright');
const { applyStealthPlugin } = require('./dist');

const browser = await chromium.launch();
await applyStealthPlugin(browser);
```

---

## 🌐 Развертывание на сервере

### VPS (Ubuntu)
```bash
# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонируйте и установите
git clone https://github.com/wpeva/new-undetect-browser.git
cd new-undetect-browser
npm install
cd frontend && npm install && cd ..

# Соберите
npm run build
cd frontend && npm run build && cd ..

# Запустите с PM2
npm install -g pm2
pm2 start npm --name antidetect -- run server
pm2 save && pm2 startup
```

### Docker на сервере
```bash
git clone https://github.com/wpeva/new-undetect-browser.git
cd new-undetect-browser
docker-compose up -d
```

---

## ❓ Проблемы?

### Порт занят
```bash
# Убить процесс на порту 3000
lsof -ti:3000 | xargs kill -9
```

### Ошибки установки
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Frontend не подключается к Backend
Проверьте `frontend/src/api/client.ts`:
```typescript
const API_URL = 'http://localhost:3000';
```

---

## 📚 Полная документация

- **Подробное руководство**: `PROJECT_SETUP_GUIDE.md`
- **API документация**: `docs/API.md`
- **README**: `README.md`
- **Развертывание**: `DEPLOYMENT.md`

---

## 🎉 ГОТОВО!

Антидетект браузер запущен и работает!

**Следующие шаги:**
1. Создайте профили браузеров
2. Добавьте прокси
3. Протестируйте на bot.sannysoft.com
4. Используйте API для автоматизации

**Поддержка:**
- GitHub Issues: https://github.com/wpeva/new-undetect-browser/issues
- Документация: В папке `docs/`

---

**Проект готов к использованию!** 🚀
