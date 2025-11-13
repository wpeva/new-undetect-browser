# Testing Documentation

## Сессия 15: Окончательная интеграция и тестирование

Эта документация описывает полную стратегию тестирования антидетект-браузера, включая E2E-тесты, нагрузочное тестирование и тестирование на обнаружение.

## Содержание

- [Обзор](#обзор)
- [Типы тестов](#типы-тестов)
- [Установка и настройка](#установка-и-настройка)
- [Запуск тестов](#запуск-тестов)
- [E2E тестирование](#e2e-тестирование)
- [Нагрузочное тестирование](#нагрузочное-тестирование)
- [Тестирование на обнаружение](#тестирование-на-обнаружение)
- [Метрики производительности](#метрики-производительности)
- [CI/CD интеграция](#cicd-интеграция)

## Обзор

Платформа тестируется на трех уровнях:

1. **Unit Tests** - Тестирование отдельных модулей и функций
2. **E2E Tests** - Тестирование всей платформы от создания сессии до её уничтожения
3. **Load Tests** - Тестирование производительности под нагрузкой (1000+ сессий)

## Типы тестов

### 1. Unit Tests (Модульные тесты)

Расположение: `tests/unit/`, `tests/modules/`

Покрывают:
- Отдельные модули защиты
- Утилиты и хелперы
- Генераторы отпечатков
- Валидаторы

```bash
npm run test:unit
```

### 2. E2E Tests (Сквозные тесты)

Расположение: `tests/e2e/`

Тесты:
- `full-platform.test.ts` - Полный жизненный цикл платформы
- `detection-comprehensive.test.ts` - Тестирование против детекторов
- `performance-metrics.test.ts` - Метрики производительности

```bash
npm run test:e2e
```

### 3. Load Tests (Нагрузочные тесты)

Расположение: `tests/load/`

Используют k6 для нагрузочного тестирования:
- `stress-test.js` - Полный нагрузочный тест (1000+ сессий)
- `quick-load-test.js` - Быстрый тест для разработки

```bash
npm run test:load
npm run test:load:quick
```

### 4. Detection Tests (Тесты на обнаружение)

Расположение: `tests/detection/`, `tests/e2e/detection-comprehensive.test.ts`

Тестируют против:
- Pixelscan.net
- CreepJS
- Sannysoft
- Incolumitas
- BrowserLeaks (WebRTC, Canvas, Audio, WebGL)
- Arh.Antoinevastel

```bash
npm run test:detection
```

## Установка и настройка

### Предварительные требования

```bash
# Node.js 18+
node --version

# Jest для unit и E2E тестов
npm install

# k6 для нагрузочного тестирования
# Mac
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Настройка окружения

Создайте файл `.env` для конфигурации тестов:

```bash
# API endpoint
API_BASE_URL=https://api.antidetect.io

# Test configuration
TEST_TIMEOUT=120000
TEST_CONCURRENT_SESSIONS=10

# Load test configuration
LOAD_TEST_MAX_VUS=1000
LOAD_TEST_DURATION=50m
```

## Запуск тестов

### Все тесты

```bash
# Запуск всех тестов
npm test

# С покрытием кода
npm run test:coverage
```

### Unit тесты

```bash
# Все unit тесты
npm run test:unit

# Конкретный модуль
npm test -- tests/unit/fingerprint-spoofing.test.ts

# В режиме watch
npm run test:watch
```

### E2E тесты

```bash
# Все E2E тесты
npm run test:e2e

# Только платформенные тесты
npm test -- tests/e2e/full-platform.test.ts

# Только detection тесты
npm test -- tests/e2e/detection-comprehensive.test.ts

# С подробным выводом
npm run test:e2e -- --verbose
```

### Нагрузочные тесты

```bash
# Полный нагрузочный тест (50 минут)
npm run test:load

# Быстрый тест (3-4 минуты)
npm run test:load:quick

# Кастомная конфигурация
k6 run --vus 100 --duration 5m tests/load/stress-test.js

# С выводом в файл
k6 run tests/load/stress-test.js --out json=results.json
```

### Performance тесты

```bash
# Тесты производительности
npm run test:performance

# С детальными метриками
npm test -- tests/e2e/performance-metrics.test.ts --verbose
```

## E2E тестирование

### Full Platform Test

Тест `full-platform.test.ts` проверяет:

1. **Создание сессии** через API
2. **Выполнение скриптов** detection тестов
3. **Проверка результатов** против известных детекторов
4. **Очистка ресурсов**

Пример:

```typescript
describe('Full Platform E2E Test', () => {
  it('should create session, execute script, pass detection tests', async () => {
    // 1. Создание сессии
    const session = await createSession({
      country: 'US',
      os: 'windows',
      protectionLevel: 'paranoid'
    });

    // 2. Выполнение detection тестов
    const results = await executeDetectionTests(session.id);

    // 3. Проверка результатов
    expect(results.pixelscan).toContain('100%');
    expect(results.creepjs).toContain('A+');
    expect(results.webrtc).toContain('No leaks');

    // 4. Cleanup
    await destroySession(session.id);
  });
});
```

### Ожидаемые результаты

| Тест | Критерий успеха |
|------|-----------------|
| Session Creation | < 5 секунд |
| Script Execution | < 2 секунды |
| Pixelscan Score | ≥ 80% |
| CreepJS Grade | A+ / A / B+ |
| WebRTC Leaks | 0 утечек |
| Sannysoft Pass Rate | ≥ 80% |

## Нагрузочное тестирование

### Stress Test Configuration

Тест `stress-test.js` проходит через следующие этапы:

| Этап | Длительность | Целевое кол-во VUs |
|------|--------------|-------------------|
| Ramp-up 1 | 5 минут | 100 |
| Plateau 1 | 10 минут | 100 |
| Ramp-up 2 | 5 минут | 500 |
| Plateau 2 | 10 минут | 500 |
| Ramp-up 3 | 5 минут | 1000 |
| Plateau 3 | 10 минут | 1000 |
| Ramp-down | 5 минут | 0 |

**Общее время:** ~50 минут

### Метрики производительности

```javascript
export const options = {
  thresholds: {
    // 95% запросов должны выполняться за < 5с
    http_req_duration: ['p(95)<5000'],

    // < 1% ошибок
    http_req_failed: ['rate<0.01'],

    // Успешное создание сессий > 99%
    session_creation_success: ['rate>0.99'],

    // Успешное выполнение > 98%
    session_execution_success: ['rate>0.98'],
  }
};
```

### Анализ результатов

После выполнения теста k6 генерирует:

1. **summary.json** - JSON с полными метриками
2. **summary.html** - HTML отчет с визуализацией
3. Вывод в консоль с основными показателями

Пример вывода:

```
Load Test Summary
================

HTTP Requests:
  Total: 45000
  Failed: 0.3%
  Duration (avg): 1234.56ms
  Duration (p95): 4567.89ms

Sessions:
  Created: 15000
  Failed: 45
  Success Rate: 99.7%
```

## Тестирование на обнаружение

### Comprehensive Detection Test

Тест `detection-comprehensive.test.ts` проверяет платформу против всех основных детекторов:

#### 1. Pixelscan.net

**Что проверяет:**
- Консистентность fingerprint
- Canvas/WebGL консистентность
- Аномалии в свойствах браузера

**Ожидаемый результат:** Оценка 80%+

```typescript
it('should pass Pixelscan detection with high score', async () => {
  await page.goto('https://pixelscan.net');
  await page.waitForTimeout(10000);

  const score = await page.$eval('.score', el => el.textContent);
  expect(score).toContain('80'); // или выше
});
```

#### 2. CreepJS

**Что проверяет:**
- Trust score на основе множества параметров
- Консистентность API
- Уникальность fingerprint

**Ожидаемый результат:** Grade A+/A/B+

#### 3. Sannysoft

**Что проверяет:**
- WebDriver флаги
- Automation свойства
- Chrome/DevTools признаки

**Ожидаемый результат:** 80%+ тестов пройдено

#### 4. BrowserLeaks

**Что проверяет:**

a) **WebRTC Leak Test**
- IP утечки через WebRTC
- Local IP disclosure

**Ожидаемый результат:** 0 утечек

b) **Canvas Fingerprinting**
- Консистентность canvas отпечатка
- Уникальность отпечатка

c) **Audio Fingerprinting**
- Audio context fingerprint
- AudioContext API консистентность

d) **WebGL Fingerprinting**
- WebGL vendor/renderer
- WebGL extensions

#### 5. Incolumitas

**Что проверяет:**
- Headless detection
- Bot behavior patterns

**Ожидаемый результат:** Not detected as bot

#### 6. Arh.Antoinevastel

**Что проверяет:**
- Headless Chrome признаки
- Automation framework признаки

**Ожидаемый результат:** Not detected as headless

### Запуск detection тестов

```bash
# Все detection тесты
npm run test:detection

# С подробным выводом
npm test -- tests/e2e/detection-comprehensive.test.ts --verbose

# Только определенные детекторы
npm test -- tests/e2e/detection-comprehensive.test.ts -t "Pixelscan"
npm test -- tests/e2e/detection-comprehensive.test.ts -t "CreepJS"
```

### Интерпретация результатов

После выполнения тестов выводится сводка:

```
========================================
DETECTION TEST RESULTS SUMMARY
========================================

✅ PASSED - Pixelscan.net
  Score: 92%

✅ PASSED - CreepJS
  Score: A+
  Details: { trustScore: 85 }

✅ PASSED - Sannysoft
  Score: 88.5%
  Details: { total: 20, passed: 18, failed: 2 }

✅ PASSED - BrowserLeaks WebRTC
  Score: No leaks

✅ PASSED - BrowserLeaks Canvas
  Score: abc123def456...

✅ PASSED - Incolumitas
  Score: Not Detected

✅ PASSED - Arh.Antoinevastel
  Score: Not Detected as Bot/Headless

✅ PASSED - Fingerprint Consistency
  Score: Consistent

✅ PASSED - Automation Property Check

========================================
Overall Pass Rate: 100% (9/9)
========================================
```

## Метрики производительности

### Performance Metrics Test

Тест `performance-metrics.test.ts` измеряет:

1. **Session Lifecycle Performance**
   - Время создания сессии
   - Время выполнения скрипта
   - Время уничтожения сессии

2. **Concurrent Operations**
   - Одновременное создание сессий
   - Параллельное выполнение скриптов

3. **Complex Operations**
   - Сложные detection тесты
   - Последовательная нагрузка

4. **Resource Management**
   - Очистка ресурсов
   - Управление памятью
   - Обработка больших payload

5. **Latency and Response Time**
   - API latency
   - Network overhead

### Целевые показатели

| Метрика | Целевое значение |
|---------|------------------|
| Session Creation | < 5s |
| Script Execution | < 2s |
| Session Destruction | < 1s |
| Total Lifecycle | < 15s |
| Concurrent 10 Sessions | < 15s |
| Concurrent 50 Executions | < 30s |
| API Latency (avg) | < 100ms |
| HTTP Request p95 | < 5s |
| Error Rate | < 1% |

### Запуск performance тестов

```bash
# Все performance тесты
npm run test:performance

# С детальными метриками
npm test -- tests/e2e/performance-metrics.test.ts --verbose

# Конкретная категория
npm test -- tests/e2e/performance-metrics.test.ts -t "Session Lifecycle"
```

### Анализ производительности

После выполнения выводится сводка:

```
========================================
PERFORMANCE METRICS SUMMARY
========================================
Average Session Creation: 2341.56ms
Average Script Execution: 876.23ms
Average Session Destruction: 234.12ms
Average Total Time: 3451.91ms
Total Tests: 15
========================================
```

## CI/CD интеграция

### GitHub Actions

Создайте `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:e2e
    env:
      API_BASE_URL: ${{ secrets.API_BASE_URL }}

  load-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1
      - run: k6 run tests/load/quick-load-test.js
    env:
      API_BASE_URL: ${{ secrets.API_BASE_URL }}
```

### Локальный CI

```bash
# Запустить все тесты как в CI
npm run ci

# С покрытием
npm run test:ci:coverage
```

## Troubleshooting

### Частые проблемы

#### 1. Timeout ошибки

```bash
# Увеличить timeout
npm test -- --testTimeout=300000

# Или в .env
TEST_TIMEOUT=300000
```

#### 2. Detection тесты падают

- Проверьте интернет соединение
- Убедитесь, что детектор доступен
- Некоторые детекторы могут быть временно недоступны

```bash
# Запустить конкретный тест для отладки
npm test -- tests/e2e/detection-comprehensive.test.ts -t "Pixelscan" --verbose
```

#### 3. Load тесты не запускаются

```bash
# Проверьте установку k6
k6 version

# Переустановите при необходимости
brew reinstall k6  # Mac
sudo apt-get install --reinstall k6  # Linux
```

#### 4. API недоступен

```bash
# Проверьте API endpoint
curl https://api.antidetect.io/health

# Проверьте .env конфигурацию
cat .env | grep API_BASE_URL
```

## Лучшие практики

### 1. Организация тестов

- Группируйте связанные тесты в `describe` блоки
- Используйте понятные названия тестов
- Добавляйте комментарии к сложным проверкам

### 2. Cleanup

- Всегда очищайте ресурсы в `afterEach` или `afterAll`
- Используйте `try/finally` для гарантированного cleanup

```typescript
afterEach(async () => {
  if (sessionId) {
    try {
      await destroySession(sessionId);
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
});
```

### 3. Параллелизация

- Запускайте независимые тесты параллельно
- Используйте `--maxWorkers` для контроля нагрузки

```bash
npm test -- --maxWorkers=4
```

### 4. Мониторинг

- Логируйте важные метрики
- Сохраняйте результаты для анализа трендов
- Используйте визуализацию для k6 результатов

### 5. Документация

- Документируйте сложные тест кейсы
- Обновляйте документацию при изменении тестов
- Добавляйте примеры ожидаемых результатов

## Дополнительные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Testing](https://playwright.dev/docs/test-intro)
- [k6 Documentation](https://k6.io/docs/)
- [Detection Services](docs/DETECTION_SERVICES.md)

## Контакты и поддержка

При возникновении вопросов:
- Создайте issue в репозитории
- Проверьте существующие issues
- Обратитесь к документации API

---

**Версия:** 1.0.0
**Последнее обновление:** 2025-11-13
**Сессия:** 15 - Окончательная интеграция и тестирование
