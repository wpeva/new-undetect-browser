# Testing Quick Start Guide

Быстрое руководство по запуску тестов для платформы антидетект-браузера.

## 📋 Содержание

- [Установка](#установка)
- [Быстрый запуск](#быстрый-запуск)
- [Типы тестов](#типы-тестов)
- [Примеры использования](#примеры-использования)
- [Troubleshooting](#troubleshooting)

## 🚀 Установка

### 1. Установите зависимости

```bash
npm install
```

### 2. Установите k6 для нагрузочного тестирования

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

### 3. Настройте окружение (опционально)

Создайте `.env` файл:

```bash
API_BASE_URL=https://api.antidetect.io
TEST_TIMEOUT=120000
```

## ⚡ Быстрый запуск

### Запустить все тесты

```bash
npm test
```

### Unit тесты (быстро, ~30 сек)

```bash
npm run test:unit
```

### E2E тесты (медленно, ~10 мин)

```bash
npm run test:e2e
```

### Нагрузочные тесты (долго, ~50 мин)

```bash
npm run test:load
```

### Быстрый нагрузочный тест (~4 мин)

```bash
npm run test:load:quick
```

## 📚 Типы тестов

### 1. Unit Tests

**Расположение:** `tests/unit/`, `tests/modules/`

**Что тестируют:**
- Отдельные модули защиты
- Утилиты и хелперы
- Генераторы fingerprint

**Команды:**
```bash
# Все unit тесты
npm run test:unit

# Конкретный файл
npm test -- tests/unit/fingerprint-spoofing.test.ts

# Watch mode
npm run test:watch
```

**Примеры тестов:**
- `fingerprint-spoofing.test.ts` - Тестирование подмены fingerprint
- `webdriver-evasion.test.ts` - Обход WebDriver detection
- `behavioral-simulation.test.ts` - Симуляция человеческого поведения

### 2. E2E Tests

**Расположение:** `tests/e2e/`

**Что тестируют:**
- Полный жизненный цикл платформы
- Integration с детекторами
- Performance метрики

**Команды:**
```bash
# Все E2E тесты
npm run test:e2e

# Платформенные тесты
npm run test:e2e:platform

# Detection тесты
npm run test:e2e:detection

# Performance тесты
npm run test:e2e:performance
```

**Примеры тестов:**
- `full-platform.test.ts` - Полный тест платформы
- `detection-comprehensive.test.ts` - Тесты против детекторов
- `performance-metrics.test.ts` - Метрики производительности

### 3. Load Tests

**Расположение:** `tests/load/`

**Что тестируют:**
- Обработка 1000+ одновременных сессий
- Производительность под нагрузкой
- Стабильность системы

**Команды:**
```bash
# Полный нагрузочный тест (50 мин)
npm run test:load

# Быстрый тест (4 мин)
npm run test:load:quick

# Кастомная конфигурация
k6 run --vus 100 --duration 5m tests/load/stress-test.js
```

**Примеры тестов:**
- `stress-test.js` - Полный стресс-тест
- `quick-load-test.js` - Быстрая проверка

### 4. Detection Tests

**Расположение:** `tests/detection/`, `tests/e2e/detection-comprehensive.test.ts`

**Что тестируют:**
- Pixelscan.net
- CreepJS
- Sannysoft
- Incolumitas
- BrowserLeaks (WebRTC, Canvas, Audio, WebGL)

**Команды:**
```bash
# Detection тесты
npm run test:detection

# E2E detection тесты
npm run test:e2e:detection
```

## 💡 Примеры использования

### Запустить unit тесты для конкретного модуля

```bash
npm test -- tests/unit/canvas-protection-v2.test.ts
```

### Запустить E2E тесты с подробным выводом

```bash
npm run test:e2e -- --verbose
```

### Запустить detection тесты против конкретного детектора

```bash
npm test -- tests/e2e/detection-comprehensive.test.ts -t "Pixelscan"
```

### Запустить нагрузочный тест с кастомными параметрами

```bash
k6 run --vus 200 --duration 10m tests/load/stress-test.js
```

### Запустить тесты с coverage

```bash
npm run test:coverage
```

### Запустить только быстрые unit тесты

```bash
npm run test:unit:new
```

## 🎯 Структура тестов

```
tests/
├── unit/                      # Unit тесты
│   ├── fingerprint-spoofing.test.ts
│   ├── webdriver-evasion.test.ts
│   ├── behavioral-simulation.test.ts
│   └── ...
├── modules/                   # Тесты модулей
│   ├── webgl2.test.ts
│   ├── speech-synthesis.test.ts
│   └── ...
├── e2e/                       # E2E тесты
│   ├── full-platform.test.ts
│   ├── detection-comprehensive.test.ts
│   └── performance-metrics.test.ts
├── load/                      # Нагрузочные тесты
│   ├── stress-test.js
│   └── quick-load-test.js
├── detection/                 # Detection тесты
│   └── sannysoft.test.ts
└── README.md
```

## 📊 Ожидаемые результаты

### Unit Tests

- ✅ Все тесты должны проходить
- ⏱️ Время выполнения: ~30 секунд
- 📈 Coverage: >80%

### E2E Tests

#### Full Platform Test
- ✅ Session Creation: < 5 секунд
- ✅ Script Execution: < 2 секунды
- ✅ Detection Tests: Pass

#### Detection Tests
- ✅ Pixelscan: ≥80%
- ✅ CreepJS: A+/A/B+
- ✅ Sannysoft: ≥80% pass rate
- ✅ WebRTC: 0 leaks
- ✅ Incolumitas: Not detected

#### Performance Tests
- ✅ Session Creation: < 5s
- ✅ Script Execution: < 2s
- ✅ 10 Concurrent Sessions: < 15s
- ✅ API Latency: < 100ms

### Load Tests

#### Stress Test (1000 VUs)
- ✅ HTTP Req Duration p95: < 5s
- ✅ HTTP Req Failed: < 1%
- ✅ Session Creation Success: > 99%
- ✅ Session Execution Success: > 98%

#### Quick Load Test (50 VUs)
- ✅ HTTP Req Duration p95: < 3s
- ✅ HTTP Req Failed: < 5%
- ✅ Session Creation Success: > 95%

## 🔧 Troubleshooting

### Проблема: Timeout ошибки

**Решение:**
```bash
# Увеличить timeout
npm test -- --testTimeout=300000

# Или в .env
echo "TEST_TIMEOUT=300000" >> .env
```

### Проблема: Detection тесты падают

**Причины:**
- Нет интернет соединения
- Детектор временно недоступен
- API изменился

**Решение:**
```bash
# Запустить конкретный тест для отладки
npm test -- tests/e2e/detection-comprehensive.test.ts -t "Pixelscan" --verbose

# Проверить доступность детектора
curl https://pixelscan.net
```

### Проблема: k6 не установлен

**Решение:**
```bash
# Проверить установку
k6 version

# Переустановить
brew reinstall k6  # macOS
sudo apt-get install --reinstall k6  # Linux
```

### Проблема: API недоступен

**Решение:**
```bash
# Проверить API endpoint
curl https://api.antidetect.io/health

# Проверить .env
cat .env | grep API_BASE_URL

# Установить правильный URL
export API_BASE_URL=http://localhost:3000
```

### Проблема: Тесты медленные

**Решение:**
```bash
# Запускать только быстрые unit тесты
npm run test:unit:new

# Использовать watch mode для разработки
npm run test:watch

# Запускать конкретные тесты
npm test -- tests/unit/fingerprint-spoofing.test.ts
```

### Проблема: Out of memory

**Решение:**
```bash
# Ограничить количество workers
npm test -- --maxWorkers=2

# Увеличить heap size
export NODE_OPTIONS="--max-old-space-size=4096"
npm test
```

## 📖 Дополнительная документация

Подробную документацию смотрите в:

- [TESTING.md](../docs/TESTING.md) - Полная документация по тестированию
- [DETECTION_SERVICES.md](../docs/DETECTION_SERVICES.md) - Справочник по детекторам

## 🤝 Вклад в проект

При добавлении новых тестов:

1. Следуйте существующей структуре
2. Добавляйте комментарии к сложным проверкам
3. Обновляйте документацию
4. Запустите все тесты перед commit

```bash
# Проверить код
npm run lint:fix
npm run format

# Запустить тесты
npm run test:unit
npm run validate
```

## 📝 Полезные команды

```bash
# Все тесты
npm test

# Unit тесты
npm run test:unit

# E2E тесты
npm run test:e2e

# Нагрузочные тесты
npm run test:load
npm run test:load:quick

# Performance
npm run test:performance

# Detection
npm run test:detection

# Coverage
npm run test:coverage

# Watch mode
npm run test:watch

# CI
npm run ci
```

---

**💡 Совет:** Начните с `npm run test:unit` для быстрой проверки, затем переходите к E2E и нагрузочным тестам.

**🎯 Цель:** Все тесты должны проходить перед production deploy!
