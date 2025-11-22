# Detection Services Reference

Полный справочник по сервисам обнаружения ботов и их методикам.

## Содержание

- [Обзор](#обзор)
- [Основные детекторы](#основные-детекторы)
- [Методы обнаружения](#методы-обнаружения)
- [Как защититься](#как-защититься)

## Обзор

Существует множество сервисов для обнаружения автоматизации и ботов. Каждый использует свой набор техник. Наша платформа тестируется против всех основных детекторов.

## Основные детекторы

### 1. Pixelscan.net

**URL:** https://pixelscan.net

**Что проверяет:**
- Консистентность fingerprint между различными API
- Canvas/WebGL fingerprint уникальность
- Screen properties консистентность
- Font rendering консистентность
- WebRTC properties

**Методика:**
- Сравнивает данные из разных источников
- Выявляет несоответствия в fingerprint
- Проверяет на подделку canvas/WebGL
- Анализирует временные паттерны

**Оценка:**
- 0-100% (чем выше, тем лучше)
- Зеленый: 80%+ (хороший)
- Желтый: 50-79% (подозрительный)
- Красный: <50% (плохой)

**Наша защита:**
- Consistent fingerprint между всеми API
- Realistic canvas/WebGL rendering
- Screen properties validation
- Font consistency checks

**Пример теста:**
```javascript
await page.goto('https://pixelscan.net');
await page.waitForSelector('.score');
const score = await page.$eval('.score', el => el.textContent);
// Ожидаем: 80%+
```

---

### 2. CreepJS

**URL:** https://abrahamjuliot.github.io/creepjs/

**Что проверяет:**
- Trust score на основе 50+ параметров
- Canvas fingerprint уникальность
- WebGL параметры
- Audio context fingerprint
- Screen metrics
- Fonts
- CSS media queries
- Performance API
- Timezone consistency

**Методика:**
- Собирает данные из множества источников
- Вычисляет trust score
- Сравнивает с известными паттернами
- Выявляет headless режим

**Оценка:**
- A+ (отлично)
- A (хорошо)
- B+ (приемлемо)
- B и ниже (подозрительно)

**Trust Score:**
- 85-100: Высокое доверие
- 70-84: Среднее доверие
- <70: Низкое доверие

**Наша защита:**
- Полная эмуляция всех API
- Консистентные timezone/locale
- Realistic performance timings
- Proper audio/canvas rendering

**Пример теста:**
```javascript
await page.goto('https://abrahamjuliot.github.io/creepjs/');
await page.waitForTimeout(5000);
const grade = await page.$eval('.grade', el => el.textContent);
// Ожидаем: A+, A, или B+
```

---

### 3. Sannysoft

**URL:** https://bot.sannysoft.com

**Что проверяет:**
- navigator.webdriver флаг
- Chrome/window.chrome объект
- Permissions API
- Plugins array
- Languages consistency
- WebDriver properties
- Automation flags

**Методика:**
- Простые проверки наличия automation флагов
- Проверка Chrome DevTools Protocol
- Анализ window/document properties

**Оценка:**
- Показывает список passed/failed тестов
- Зеленый = passed
- Красный = failed

**Типичные проверки:**
```
✓ navigator.webdriver is undefined
✓ window.chrome exists
✓ navigator.plugins is not empty
✓ navigator.languages is consistent
✓ No WebDriver strings in code
```

**Наша защита:**
- Удаление всех webdriver properties
- Proper Chrome object emulation
- Realistic plugins array
- Language consistency

**Пример теста:**
```javascript
await page.goto('https://bot.sannysoft.com');
await page.waitForTimeout(3000);
const tests = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('tr'));
  return rows.filter(row =>
    row.textContent.includes('failed')
  ).length;
});
// Ожидаем: минимум failed тестов
```

---

### 4. Incolumitas Bot Detection

**URL:** https://bot.incolumitas.com

**Что проверяет:**
- Headless Chrome признаки
- Bot behavior patterns
- Mouse movement patterns
- Timing analysis
- WebDriver properties
- Chrome DevTools Protocol

**Методика:**
- Продвинутые эвристики
- Machine learning модели
- Behavioral analysis
- Timing inconsistencies

**Оценка:**
- "You are a bot" / "You are not a bot"
- Показывает детальную информацию

**Наша защита:**
- Advanced headless detection bypass
- Human-like mouse movements
- Realistic timing
- Complete CDP masking

**Пример теста:**
```javascript
await page.goto('https://bot.incolumitas.com');
await page.waitForTimeout(5000);
const bodyText = await page.evaluate(() => document.body.textContent);
const isBot = bodyText.toLowerCase().includes('bot detected');
// Ожидаем: false
```

---

### 5. BrowserLeaks

**URL:** https://browserleaks.com

Набор тестов для различных утечек и fingerprinting.

#### 5.1. WebRTC Leak Test

**URL:** https://browserleaks.com/webrtc

**Что проверяет:**
- WebRTC IP утечки
- Local IP disclosure
- Public IP через ICE candidates

**Методика:**
- Создает RTCPeerConnection
- Собирает ICE candidates
- Извлекает local/public IP

**Наша защита:**
- WebRTC IP masking
- Fake ICE candidates
- Local IP spoofing

**Пример:**
```javascript
await page.goto('https://browserleaks.com/webrtc');
await page.waitForTimeout(5000);
const leaks = await page.$$('.ip-address');
// Ожидаем: 0 утечек
```

#### 5.2. Canvas Fingerprinting

**URL:** https://browserleaks.com/canvas

**Что проверяет:**
- Canvas rendering fingerprint
- Canvas hash уникальность
- 2D context rendering

**Методика:**
- Рисует текст/фигуры на canvas
- Извлекает imageData
- Вычисляет hash

**Наша защита:**
- Consistent canvas noise
- Realistic rendering
- Hardware-specific emulation

**Пример:**
```javascript
await page.goto('https://browserleaks.com/canvas');
const hash = await page.$eval('.hash', el => el.textContent);
// Ожидаем: консистентный hash
```

#### 5.3. Audio Fingerprinting

**URL:** https://browserleaks.com/audio

**Что проверяет:**
- AudioContext fingerprint
- Audio processing hash

**Методика:**
- Создает AudioContext
- Обрабатывает сигнал через analyser
- Вычисляет hash

**Наша защита:**
- Realistic audio processing
- Hardware-consistent output

#### 5.4. WebGL Fingerprinting

**URL:** https://browserleaks.com/webgl

**Что проверяет:**
- WebGL vendor/renderer
- WebGL extensions
- Rendering capabilities

**Методика:**
- Извлекает WebGL параметры
- Проверяет extensions
- Анализирует rendering

**Наша защита:**
- Hardware-matched WebGL params
- Realistic extensions list
- Consistent vendor/renderer

---

### 6. Arh.Antoinevastel - Headless Detection

**URL:** https://arh.antoinevastel.com/bots/areyouheadless

**Что проверяет:**
- Headless Chrome специфичные признаки
- Chrome DevTools Protocol
- User interaction capabilities
- Window properties

**Методика:**
- Проверяет chrome.runtime
- Анализирует permissions
- Проверяет notification API
- Ищет CDP artifacts

**Наша защита:**
- Complete headless masking
- Proper Chrome API emulation
- User interaction simulation

**Пример теста:**
```javascript
await page.goto('https://arh.antoinevastel.com/bots/areyouheadless');
await page.waitForTimeout(5000);
const result = await page.evaluate(() => document.body.textContent);
const isHeadless = result.toLowerCase().includes('headless');
// Ожидаем: false
```

---

### 7. FingerprintJS (Commercial)

**URL:** https://fingerprintjs.com

**Что проверяет:**
- Comprehensive fingerprint (100+ signals)
- Bot detection
- Incognito mode detection
- Browser/Device identification

**Методика:**
- Собирает множество сигналов
- Machine learning анализ
- Behavioral analysis
- Cloud-based scoring

**Наша защита:**
- Consistent fingerprint
- Natural behavior patterns
- Anti-detection techniques

---

## Методы обнаружения

### 1. WebDriver Detection

**Что проверяется:**
```javascript
navigator.webdriver
window.document.__webdriver_script_fn
window.document.$cdc_
```

**Защита:**
- Удаление всех webdriver properties
- Очистка window/document объектов

### 2. Chrome Object Detection

**Что проверяется:**
```javascript
window.chrome
window.chrome.runtime
```

**Защита:**
- Эмуляция полного chrome объекта
- Realistic runtime API

### 3. Permissions API

**Что проверяется:**
```javascript
navigator.permissions.query({name: 'notifications'})
```

**Защита:**
- Proper permissions API emulation
- Consistent responses

### 4. Plugin Detection

**Что проверяется:**
```javascript
navigator.plugins.length
navigator.mimeTypes.length
```

**Защита:**
- Realistic plugins array
- Platform-specific plugins

### 5. Language Detection

**Что проверяется:**
```javascript
navigator.language
navigator.languages
```

**Защита:**
- Geo-consistent languages
- Proper Accept-Language headers

### 6. Canvas Fingerprinting

**Что проверяется:**
```javascript
canvas.toDataURL()
canvas.getImageData()
```

**Защита:**
- Hardware-consistent rendering
- Subtle noise injection
- Consistent across sessions

### 7. WebGL Fingerprinting

**Что проверяется:**
```javascript
gl.getParameter(gl.VENDOR)
gl.getParameter(gl.RENDERER)
```

**Защита:**
- Hardware-matched parameters
- Consistent rendering
- Realistic extensions

### 8. Audio Fingerprinting

**Что проверяется:**
```javascript
AudioContext
AnalyserNode
OscillatorNode
```

**Защита:**
- Hardware-consistent audio
- Realistic processing

### 9. Screen & Viewport

**Что проверяется:**
```javascript
screen.width/height
window.innerWidth/innerHeight
devicePixelRatio
```

**Защита:**
- Consistent screen metrics
- Realistic viewport
- Proper pixel ratio

### 10. Timezone & Locale

**Что проверяется:**
```javascript
Intl.DateTimeFormat().resolvedOptions().timeZone
navigator.language
```

**Защита:**
- Geo-consistent timezone
- Matching locale settings

### 11. Hardware Concurrency

**Что проверяется:**
```javascript
navigator.hardwareConcurrency
```

**Защита:**
- Realistic CPU count
- Platform-specific values

### 12. Device Memory

**Что проверяется:**
```javascript
navigator.deviceMemory
```

**Защита:**
- Hardware-appropriate values
- Consistent with other metrics

### 13. Performance Timing

**Что проверяется:**
```javascript
performance.timing
performance.now()
```

**Защита:**
- Realistic timing values
- Natural variance

### 14. Battery API

**Что проверяется:**
```javascript
navigator.getBattery()
```

**Защита:**
- Platform-appropriate response
- Desktop vs mobile difference

### 15. Connection Info

**Что проверяется:**
```javascript
navigator.connection
```

**Защита:**
- Realistic connection info
- Platform-specific values

## Как защититься

### 1. Используйте высокий уровень защиты

```typescript
const browser = new UndetectBrowser({
  protectionLevel: 'paranoid', // максимальная защита
});
```

### 2. Консистентный fingerprint

```typescript
const browser = new UndetectBrowser({
  fingerprint: {
    country: 'US',
    os: 'windows',
    screen: { width: 1920, height: 1080 },
  },
  consistentFingerprint: true,
});
```

### 3. Realistic behavior

```typescript
// Включите realistic human behavior
const page = await browser.newPage({
  enableBehavioralSimulation: true,
});
```

### 4. Регулярное тестирование

```bash
# Запускайте detection тесты регулярно
npm run test:detection
```

### 5. Мониторинг изменений

- Подписывайтесь на обновления детекторов
- Регулярно проверяйте новые методы detection
- Обновляйте защиту при необходимости

### 6. Комбинирование техник

```typescript
const browser = new UndetectBrowser({
  protectionLevel: 'paranoid',
  consistentFingerprint: true,
  enableBehavioralSimulation: true,
  proxy: proxyUrl,
  userAgent: customUA,
});
```

## Ресурсы

- [Bot Detection Papers](https://scholar.google.com/scholar?q=bot+detection)
- [Fingerprinting Techniques](https://github.com/fingerprintjs/fingerprintjs)
- [WebDriver Detection](https://github.com/intoli/user-agents)

---

**Версия:** 1.0.0
**Последнее обновление:** 2025-11-13
