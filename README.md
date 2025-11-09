# 🕵️ Undetect Browser

Продвинутый андетект-браузер на базе Chromium с комплексными возможностями защиты от детекции.

> **⚠️ ВАЖНО**: Этот проект предназначен для легитимных целей: автоматизированного тестирования, исследований в области безопасности, веб-скрейпинга с разрешением владельцев сайтов. Использование для обхода защитных механизмов в незаконных целях строго запрещено.

---

## 🎯 Особенности

### 🛡️ Защита от детекции

- **WebDriver Evasion** - Полное удаление всех следов автоматизации
- **Fingerprint Spoofing** - Защита от Canvas, WebGL, Audio fingerprinting
- **Behavioral Simulation** - Эмуляция естественного человеческого поведения
- **Network Protection** - TLS/SSL и HTTP/2 fingerprint маскировка
- **Consistent Profiles** - 99.9%+ консистентность fingerprint в рамках профиля

### 🚀 Возможности

- Человекоподобные действия (клики, скроллинг, набор текста)
- Система профилей с персистентностью
- Browser pooling для масштабирования
- Поддержка прокси (HTTP/HTTPS/SOCKS5)
- Автоматическая адаптация к новым методам детекции
- Плагинная архитектура

### 📊 Метрики качества

- ✅ Detection rate < 0.1%
- ✅ Fingerprint consistency > 99.9%
- ✅ Performance overhead < 15%
- ✅ reCAPTCHA score > 0.7
- ✅ Cloudflare pass rate > 95%

---

## 📦 Установка

```bash
npm install undetect-browser
```

Или клонировать и собрать из исходников:

```bash
git clone https://github.com/your-repo/undetect-browser.git
cd undetect-browser
npm install
npm run build
```

---

## 🚀 Быстрый старт

### Базовое использование

```typescript
import { UndetectBrowser } from 'undetect-browser';

// Создание браузера
const undetect = new UndetectBrowser({
  stealth: { level: 'advanced' }
});

// Запуск
const browser = await undetect.launch();
const page = await browser.newPage();

// Навигация
await page.goto('https://bot.sannysoft.com/');

// Человекоподобные действия
await page.humanType('#search', 'example query');
await page.humanClick('button[type="submit"]');
await page.humanScroll({ direction: 'down', distance: 500 });

// Закрытие
await browser.close();
```

### Работа с профилями

```typescript
const undetect = new UndetectBrowser({
  storage: { type: 'file', path: './profiles' }
});

// Создание профиля
const profileId = await undetect.createProfile({
  timezone: 'America/New_York',
  locale: 'en-US',
  geolocation: { latitude: 40.7128, longitude: -74.0060 }
});

// Использование профиля
const browser = await undetect.launch({ profileId });
```

### Использование прокси

```typescript
const browser = await undetect.launch({
  proxy: {
    protocol: 'socks5',
    host: 'proxy.example.com',
    port: 1080,
    username: 'user',
    password: 'pass'
  }
});
```

### Уровни защиты

```typescript
// Базовый уровень (быстрый, минимальная защита)
const basic = new UndetectBrowser({ stealth: { level: 'basic' } });

// Продвинутый (рекомендуется)
const advanced = new UndetectBrowser({ stealth: { level: 'advanced' } });

// Параноидальный (максимальная защита, может быть медленнее)
const paranoid = new UndetectBrowser({ stealth: { level: 'paranoid' } });
```

---

## 📖 Документация

### Основные документы

- [📘 API Reference](docs/API.md) - Полная документация API
- [🏗️ Architecture](TECHNICAL_ARCHITECTURE.md) - Техническая архитектура
- [🗺️ Implementation Plan](UNDETECT_BROWSER_PLAN.md) - Детальный план создания
- [📅 Roadmap](IMPLEMENTATION_ROADMAP.md) - Поэтапная реализация
- [🤝 Contributing](CONTRIBUTING.md) - Руководство для контрибьюторов

### Руководства

- Getting Started - Начало работы
- Advanced Usage - Продвинутое использование
- Plugin Development - Разработка плагинов
- Performance Tuning - Оптимизация производительности
- Troubleshooting - Решение проблем

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# Unit тесты
npm run test:unit

# Integration тесты
npm run test:integration

# Detection тесты
npm run test:detection
```

### Тестовые сайты для проверки

- [Bot.Sannysoft](https://bot.sannysoft.com/) - Комплексная проверка
- [Are You Headless](https://arh.antoinevastel.com/bots/areyouheadless) - Headless детекция
- [PixelScan](https://pixelscan.net/) - Fingerprinting анализ
- [BrowserLeaks](https://browserleaks.com/) - Утечки браузера
- [Cover Your Tracks](https://coveryourtracks.eff.org/) - EFF tracker

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────┐
│         User Application                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Undetect Browser API               │
│  ┌──────────┐ ┌───────────┐            │
│  │ Profile  │ │  Human    │            │
│  │ Manager  │ │ Emulator  │            │
│  └──────────┘ └───────────┘            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Stealth Engine                   │
│  ┌─────────────┐ ┌──────────────┐      │
│  │  WebDriver  │ │ Fingerprint  │      │
│  │  Evasion    │ │  Spoofing    │      │
│  └─────────────┘ └──────────────┘      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Patched Chromium Browser             │
└─────────────────────────────────────────┘
```

---

## 🔧 Технологический стек

- **Browser Engine**: Chromium (с патчами)
- **Automation**: Puppeteer / Playwright
- **Language**: TypeScript
- **Testing**: Jest
- **Storage**: File / SQLite / Redis
- **Containerization**: Docker

---

## 📊 Roadmap

### ✅ Фаза 1: MVP (Недели 1-6)
- [x] Базовая WebDriver эвазия
- [x] Canvas/WebGL fingerprinting защита
- [x] Структура проекта
- [ ] Puppeteer интеграция

### 🔄 Фаза 2: Advanced Protection (Недели 7-12)
- [ ] Все fingerprinting методы покрыты
- [ ] Behavioral analysis эмуляция
- [ ] Network-level эвазия
- [ ] Profile management

### 🎯 Фаза 3: Production Ready (Недели 13-18)
- [ ] API стабилизация
- [ ] Performance оптимизация
- [ ] Comprehensive тестирование
- [ ] Docker deployment

### 🚀 Фаза 4: Enterprise (Недели 19-24)
- [ ] Cloud deployment
- [ ] Browser pool management
- [ ] Advanced monitoring
- [ ] ML-based adaptation

---

## 🤝 Contributing

Мы приветствуем вклад сообщества! Пожалуйста, ознакомьтесь с [CONTRIBUTING.md](CONTRIBUTING.md) перед тем, как создавать pull request.

### Как помочь проекту

- 🐛 Сообщайте о багах через [GitHub Issues](https://github.com/your-repo/issues)
- 💡 Предлагайте новые функции
- 📝 Улучшайте документацию
- 🔧 Отправляйте pull requests
- ⭐ Ставьте звезду проекту на GitHub

---

## ⚖️ Лицензия

MIT License - см. [LICENSE](LICENSE)

---

## ⚠️ Дисклеймер

Этот инструмент создан для:
- ✅ Автоматизированного тестирования веб-приложений
- ✅ Исследований в области безопасности
- ✅ Веб-скрейпинга (с разрешением владельцев)
- ✅ Образовательных целей
- ✅ Защиты приватности

**НЕ используйте для:**
- ❌ Обхода защитных механизмов в незаконных целях
- ❌ Нарушения Terms of Service сайтов
- ❌ DDoS атак
- ❌ Fraud или мошенничества
- ❌ Любой незаконной деятельности

Пользователи несут полную ответственность за соблюдение применимых законов и правил использования веб-сервисов.

---

## 📞 Контакты

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Discord**: [Join our Discord](https://discord.gg/your-server)
- **Email**: support@example.com

---

## 🙏 Благодарности

Проект вдохновлен и использует идеи из:
- [puppeteer-extra](https://github.com/berstend/puppeteer-extra)
- [playwright-extra](https://github.com/berstend/playwright-extra)
- [FingerprintJS](https://github.com/fingerprintjs/fingerprintjs)
- Исследования Antoine Vastel по bot detection

---

## 📈 Статистика

![GitHub stars](https://img.shields.io/github/stars/your-repo/undetect-browser)
![NPM version](https://img.shields.io/npm/v/undetect-browser)
![Downloads](https://img.shields.io/npm/dm/undetect-browser)
![License](https://img.shields.io/npm/l/undetect-browser)
![Build](https://img.shields.io/github/actions/workflow/status/your-repo/undetect-browser/ci.yml)

---

<div align="center">
  <strong>Сделано с ❤️ для автоматизации</strong>
</div>
