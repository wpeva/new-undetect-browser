# 🔍 Анализ методов детекции браузеров

Полный справочник по всем известным методам детекции автоматизации и способам защиты.

---

## 📋 Оглавление

1. [WebDriver Detection](#1-webdriver-detection)
2. [Browser Fingerprinting](#2-browser-fingerprinting)
3. [Behavioral Analysis](#3-behavioral-analysis)
4. [Network-Level Detection](#4-network-level-detection)
5. [Advanced Techniques](#5-advanced-techniques)

---

## 1. WebDriver Detection

### 1.1 Navigator.webdriver

**Метод детекции:**
```javascript
if (navigator.webdriver === true) {
  // Automation detected
}
```

**Защита:**
```javascript
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true
});
```

**Важно:** Значение должно быть `undefined`, а не `false`!

---

### 1.2 Chrome DevTools Protocol (CDP)

**Методы детекции:**
```javascript
// Поиск CDP переменных
const cdcKeys = Object.keys(window).filter(key =>
  /^(cdc_|__webdriver|__driver|__selenium)/.test(key)
);

// Типичные переменные:
// - cdc_adoQpoasnfa76pfcZLmcfl_Array
// - cdc_adoQpoasnfa76pfcZLmcfl_Promise
// - cdc_adoQpoasnfa76pfcZLmcfl_Symbol
// - __webdriver_script_fn
// - __driver_evaluate
```

**Защита:**
```javascript
// Удаление всех CDP переменных
Object.keys(window).forEach(key => {
  if (/^(cdc_|__webdriver|__driver|__selenium)/.test(key)) {
    delete window[key];
  }
});
```

---

### 1.3 Chrome Runtime

**Детекция:**
```javascript
// Отсутствие chrome.runtime в автоматизированном браузере
if (!window.chrome || !window.chrome.runtime) {
  // Likely automated
}
```

**Защита:**
```javascript
if (!window.chrome) {
  window.chrome = {};
}

window.chrome.runtime = {
  OnInstalledReason: {
    CHROME_UPDATE: "chrome_update",
    INSTALL: "install",
    UPDATE: "update",
  },
  // ... другие свойства
};
```

---

### 1.4 Permissions API

**Детекция:**
```javascript
const permissionStatus = await navigator.permissions.query({ name: 'notifications' });
// В headless часто возвращает denied автоматически
```

**Защита:**
```javascript
const originalQuery = navigator.permissions.query;
navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters)
);
```

---

### 1.5 Plugins

**Детекция:**
```javascript
// В headless обычно 0 плагинов
if (navigator.plugins.length === 0) {
  // Suspicious
}
```

**Защита:**
```javascript
Object.defineProperty(navigator, 'plugins', {
  get: () => [
    {
      0: {type: "application/x-google-chrome-pdf", suffixes: "pdf"},
      description: "Portable Document Format",
      filename: "internal-pdf-viewer",
      length: 1,
      name: "Chrome PDF Plugin"
    },
    // ... другие стандартные плагины
  ]
});
```

---

## 2. Browser Fingerprinting

### 2.1 Canvas Fingerprinting

**Метод детекции:**
```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.textBaseline = 'top';
ctx.font = '14px Arial';
ctx.fillText('Hello, world!', 2, 2);

const fingerprint = canvas.toDataURL();
// Каждая система генерирует уникальный fingerprint
// Одинаковые fingerprints = подозрительно
```

**Защита:**
```javascript
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(...args) {
  const context = this.getContext('2d');
  if (context) {
    const imageData = context.getImageData(0, 0, this.width, this.height);

    // Добавление микро-шума
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (Math.random() < 0.001) {
        const noise = Math.floor(Math.random() * 3) - 1;
        imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
      }
    }

    context.putImageData(imageData, 0, 0);
  }

  return originalToDataURL.apply(this, args);
};
```

**Важные моменты:**
- Noise должен быть консистентным в рамках сессии
- Слишком большой noise детектируется
- Оптимальный уровень: ±1-2 пикселя на 0.1-0.3% пикселей

---

### 2.2 WebGL Fingerprinting

**Детекция:**
```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');

// Vendor и Renderer
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

// Эти значения уникальны для каждой видеокарты
// В виртуальных машинах часто "SwiftShader" или "ANGLE"
```

**Защита:**
```javascript
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  // 37445 = UNMASKED_VENDOR_WEBGL
  if (parameter === 37445) {
    return 'Intel Inc.';
  }
  // 37446 = UNMASKED_RENDERER_WEBGL
  if (parameter === 37446) {
    return 'Intel Iris OpenGL Engine';
  }
  return getParameter.call(this, parameter);
};
```

**Реалистичные комбинации:**
```javascript
const webglConfigs = [
  {
    vendor: 'Intel Inc.',
    renderer: 'Intel Iris OpenGL Engine'
  },
  {
    vendor: 'NVIDIA Corporation',
    renderer: 'NVIDIA GeForce GTX 1060/PCIe/SSE2'
  },
  {
    vendor: 'ATI Technologies Inc.',
    renderer: 'AMD Radeon RX 580'
  }
];
```

---

### 2.3 Audio Context Fingerprinting

**Детекция:**
```javascript
const audioContext = new AudioContext();
const oscillator = audioContext.createOscillator();
const analyser = audioContext.createAnalyser();
const gainNode = audioContext.createGain();

oscillator.connect(analyser);
analyser.connect(gainNode);
gainNode.connect(audioContext.destination);

oscillator.start(0);
// Анализ выходного сигнала создает уникальный fingerprint
```

**Защита:**
```javascript
const createOscillator = AudioContext.prototype.createOscillator;
AudioContext.prototype.createOscillator = function() {
  const oscillator = createOscillator.apply(this, arguments);
  const originalStart = oscillator.start;

  oscillator.start = function(...args) {
    // Добавление микро-вариаций
    if (this.frequency) {
      const variation = (Math.random() - 0.5) * 0.0001;
      this.frequency.value += variation;
    }
    return originalStart.apply(this, args);
  };

  return oscillator;
};
```

---

### 2.4 Font Fingerprinting

**Детекция:**
```javascript
// Измерение доступных шрифтов через размеры текста
const baseFonts = ['monospace', 'sans-serif', 'serif'];
const testString = 'mmmmmmmmmmlli';
const testSize = '72px';

function detectFont(font) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Измерение с базовым шрифтом
  ctx.font = testSize + ' ' + baseFonts[0];
  const baseWidth = ctx.measureText(testString).width;

  // Измерение с тестируемым шрифтом
  ctx.font = testSize + ' ' + font + ', ' + baseFonts[0];
  const testWidth = ctx.measureText(testString).width;

  return baseWidth !== testWidth;
}

// Список установленных шрифтов уникален для каждой системы
```

**Защита:**
```javascript
// Возврат стандартного набора шрифтов
const standardFonts = [
  'Arial', 'Verdana', 'Times New Roman', 'Courier New',
  'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS',
  'Trebuchet MS', 'Impact'
];

// Блокировка измерения нестандартных шрифтов
const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
CanvasRenderingContext2D.prototype.measureText = function(text) {
  const fontFamily = this.font.split(' ').pop().replace(/['"]/g, '');

  if (!standardFonts.includes(fontFamily.split(',')[0].trim())) {
    // Возврат стандартного размера для неизвестных шрифтов
    this.font = this.font.replace(fontFamily, 'Arial');
  }

  return originalMeasureText.call(this, text);
};
```

---

### 2.5 Screen & Window Properties

**Детекция:**
```javascript
// Проверка консистентности
const screenWidth = window.screen.width;
const screenHeight = window.screen.height;
const availWidth = window.screen.availWidth;
const availHeight = window.screen.availHeight;

// В headless часто нереалистичные значения
// Или несоответствие между разными API
```

**Защита:**
```javascript
Object.defineProperties(screen, {
  width: { get: () => 1920 },
  height: { get: () => 1080 },
  availWidth: { get: () => 1920 },
  availHeight: { get: () => 1040 }, // 40px для taskbar
  colorDepth: { get: () => 24 },
  pixelDepth: { get: () => 24 }
});

// Консистентность с другими API
Object.defineProperty(window, 'outerWidth', {
  get: () => 1920
});
Object.defineProperty(window, 'outerHeight', {
  get: () => 1080
});
```

**Популярные разрешения (2024):**
- 1920x1080 (Full HD) - 22.5%
- 1366x768 - 9.2%
- 1536x864 - 7.3%
- 1440x900 - 4.8%
- 2560x1440 (QHD) - 11.4%

---

### 2.6 Hardware Properties

**Детекция:**
```javascript
// Количество CPU cores
const cores = navigator.hardwareConcurrency;

// Объем памяти (GB)
const memory = navigator.deviceMemory;

// В виртуальных средах часто подозрительные значения
// Например: 2 cores, 4GB RAM
```

**Защита:**
```javascript
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => 8 // Популярное значение
});

Object.defineProperty(navigator, 'deviceMemory', {
  get: () => 8 // 8GB
});
```

**Реалистичные конфигурации:**
- 4 cores, 8GB RAM - обычный ноутбук
- 8 cores, 16GB RAM - мощный ноутбук/desktop
- 12+ cores, 32GB+ RAM - workstation

---

## 3. Behavioral Analysis

### 3.1 Mouse Movement Patterns

**Детекция:**
```javascript
let mouseEvents = [];

document.addEventListener('mousemove', (e) => {
  mouseEvents.push({
    x: e.clientX,
    y: e.clientY,
    timestamp: Date.now()
  });
});

// Анализ:
// 1. Скорость движения (px/ms)
// 2. Ускорение
// 3. Траектория (прямая vs. кривая)
// 4. Микро-движения
// 5. Паузы

// Automation признаки:
// - Идеально прямая траектория
// - Постоянная скорость
// - Отсутствие микро-движений
```

**Защита:**
```javascript
async function humanMouseMove(page, x, y) {
  const steps = Math.floor(Math.random() * 20) + 10;
  const currentPos = await page.evaluate(() => ({
    x: window.lastMouseX || 0,
    y: window.lastMouseY || 0
  }));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Bezier curve для естественной траектории
    const bezierT = t < 0.5
      ? 2 * t * t
      : -1 + (4 - 2 * t) * t;

    const currentX = currentPos.x + (x - currentPos.x) * bezierT;
    const currentY = currentPos.y + (y - currentPos.y) * bezierT;

    // Добавление jitter
    const jitterX = (Math.random() - 0.5) * 2;
    const jitterY = (Math.random() - 0.5) * 2;

    await page.mouse.move(
      currentX + jitterX,
      currentY + jitterY
    );

    // Вариативная скорость
    await delay(Math.random() * 10 + 5);
  }

  await page.evaluate((x, y) => {
    window.lastMouseX = x;
    window.lastMouseY = y;
  }, x, y);
}
```

**Метрики человеческого движения:**
- Средняя скорость: 150-300 px/sec
- Ускорение: переменное, с плавными кривыми
- Jitter: ±1-3 пикселя
- Паузы: случайные, 0.5-2 секунды

---

### 3.2 Typing Patterns

**Детекция:**
```javascript
let keyEvents = [];

document.addEventListener('keydown', (e) => {
  keyEvents.push({
    key: e.key,
    timestamp: Date.now()
  });
});

// Анализ:
// - Скорость печати (WPM)
// - Интервалы между нажатиями
// - Паттерны ошибок
// - Паузы на знаках препинания

// Automation признаки:
// - Идеальная постоянная скорость
// - Отсутствие ошибок
// - Отсутствие пауз
```

**Защита:**
```javascript
async function humanType(page, selector, text) {
  await page.click(selector);
  await delay(100 + Math.random() * 200);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Случайные опечатки (2-5%)
    if (Math.random() < 0.03 && i > 0) {
      const wrongChar = String.fromCharCode(
        char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1)
      );
      await page.keyboard.type(wrongChar);
      await delay(100 + Math.random() * 100);
      await page.keyboard.press('Backspace');
      await delay(50 + Math.random() * 50);
    }

    await page.keyboard.type(char);

    // Вариативная скорость (50-120 WPM)
    const baseDelay = 60000 / (5 * (50 + Math.random() * 70));
    let delay = baseDelay;

    // Паузы на знаках препинания
    if ([',', '.', '!', '?'].includes(char)) {
      delay += Math.random() * 300 + 200;
    }

    // Случайные "думающие" паузы
    if (Math.random() < 0.05) {
      delay += Math.random() * 700 + 300;
    }

    await delay(delay * (0.7 + Math.random() * 0.6));
  }
}
```

---

### 3.3 Click Patterns

**Детекция:**
```javascript
document.addEventListener('click', (e) => {
  // Анализ:
  // - Позиция клика относительно элемента
  // - Время между mousedown и mouseup
  // - Движение мыши перед кликом

  const element = e.target.getBoundingClientRect();
  const clickX = e.clientX - element.left;
  const clickY = e.clientY - element.top;

  // Automation признаки:
  // - Клик всегда в центре элемента
  // - Мгновенный click (0ms между down и up)
  // - Отсутствие движения перед кликом
});
```

**Защита:**
```javascript
async function humanClick(page, selector) {
  const element = await page.$(selector);
  const box = await element.boundingBox();

  // Случайный offset от центра
  const offsetX = (Math.random() - 0.5) * box.width * 0.3;
  const offsetY = (Math.random() - 0.5) * box.height * 0.3;

  const clickX = box.x + box.width / 2 + offsetX;
  const clickY = box.y + box.height / 2 + offsetY;

  // Движение к точке клика
  await humanMouseMove(page, clickX, clickY);

  // Микро-движения перед кликом
  for (let i = 0; i < 2 + Math.random() * 3; i++) {
    await page.mouse.move(
      clickX + (Math.random() - 0.5) * 3,
      clickY + (Math.random() - 0.5) * 3
    );
    await delay(10 + Math.random() * 20);
  }

  await delay(50 + Math.random() * 100);
  await page.mouse.down();

  // Реалистичное время между down и up
  await delay(30 + Math.random() * 90);
  await page.mouse.up();

  await delay(100 + Math.random() * 200);
}
```

---

### 3.4 Scroll Behavior

**Детекция:**
```javascript
let scrollEvents = [];

window.addEventListener('scroll', (e) => {
  scrollEvents.push({
    scrollY: window.scrollY,
    timestamp: Date.now()
  });
});

// Automation признаки:
// - Мгновенный scroll
// - Постоянная скорость
// - Отсутствие пауз
// - Scroll точно на определенные позиции
```

**Защита:**
```javascript
async function humanScroll(page, options = {}) {
  const direction = options.direction || 'down';
  const distance = options.distance || (Math.random() * 500 + 300);

  const steps = Math.floor(distance / (Math.random() * 30 + 20));
  const stepSize = distance / steps;

  for (let i = 0; i < steps; i++) {
    await page.evaluate((delta, dir) => {
      window.scrollBy(0, dir === 'down' ? delta : -delta);
    }, stepSize, direction);

    // Вариативная скорость
    await delay(10 + Math.random() * 20);

    // Случайные паузы ("чтение")
    if (Math.random() < 0.1) {
      await delay(500 + Math.random() * 1500);
    }
  }

  // Финальная пауза
  await delay(300 + Math.random() * 700);
}
```

---

## 4. Network-Level Detection

### 4.1 TLS/SSL Fingerprinting

**Детекция:**
```
# JA3 Fingerprint
Client Hello packet содержит:
- TLS version
- Cipher suites (и их порядок!)
- Extensions (и их порядок!)
- Supported groups
- Signature algorithms

# Chrome vs. Automation часто имеют разные fingerprints
```

**Защита:**
```cpp
// Требует патчинга BoringSSL (OpenSSL fork в Chromium)
// Файл: third_party/boringssl/ssl/ssl_client_hello.cc

// Обеспечить идентичный порядок cipher suites как в Chrome:
static const uint16_t kChromeDefaultCiphers[] = {
    TLS1_3_CK_AES_128_GCM_SHA256,
    TLS1_3_CK_AES_256_GCM_SHA384,
    TLS1_3_CK_CHACHA20_POLY1305_SHA256,
    TLS1_CK_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
    TLS1_CK_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
    // ...
};
```

**Инструменты проверки:**
- https://ja3er.com/
- https://tls.browserleaks.com/

---

### 4.2 HTTP/2 Fingerprinting

**Детекция:**
```
# AKAMAI HTTP/2 Fingerprint
Порядок и значения SETTINGS frames:
- SETTINGS_HEADER_TABLE_SIZE
- SETTINGS_ENABLE_PUSH
- SETTINGS_INITIAL_WINDOW_SIZE
- SETTINGS_MAX_HEADER_LIST_SIZE

# Window Update patterns
# Stream priorities
# Header compression
```

**Защита:**
```javascript
// Chrome settings (должны совпадать):
const chromeH2Settings = {
  SETTINGS_HEADER_TABLE_SIZE: 65536,
  SETTINGS_ENABLE_PUSH: 1,
  SETTINGS_MAX_CONCURRENT_STREAMS: 1000,
  SETTINGS_INITIAL_WINDOW_SIZE: 6291456,
  SETTINGS_MAX_HEADER_LIST_SIZE: 262144
};

// Требует патчинга на уровне Chromium network stack
```

---

### 4.3 Header Order & Values

**Детекция:**
```http
# Порядок headers имеет значение!
# Real Chrome:
GET /path HTTP/1.1
Host: example.com
Connection: keep-alive
Cache-Control: max-age=0
sec-ch-ua: "Google Chrome";v="120"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0...
Accept: text/html,application/xhtml+xml...
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9

# Automation часто нарушает этот порядок или пропускает headers
```

**Защита:**
```javascript
await page.setExtraHTTPHeaders({
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Upgrade-Insecure-Requests': '1'
});

// Важно: удалить automation headers
page.on('request', (request) => {
  const headers = request.headers();
  delete headers['X-Devtools-Emulate-Network-Conditions-Client-Id'];
  request.continue({ headers });
});
```

---

## 5. Advanced Techniques

### 5.1 Iframe Detection

**Детекция:**
```javascript
// Проверка несоответствия между iframe и parent
const iframe = document.createElement('iframe');
iframe.srcdoc = 'test';
document.body.appendChild(iframe);

// В automation часто:
if (iframe.contentWindow.navigator.webdriver !== window.navigator.webdriver) {
  // Inconsistency detected
}
```

**Защита:**
```javascript
// Обеспечить консистентность во всех контекстах
await page.evaluateOnNewDocument(() => {
  const patches = [
    () => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    },
    // ... другие патчи
  ];

  // Применить ко всем iframes
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);

    if (tagName.toLowerCase() === 'iframe') {
      element.addEventListener('load', () => {
        patches.forEach(patch => {
          try {
            element.contentWindow.eval(`(${patch.toString()})()`);
          } catch (e) {}
        });
      });
    }

    return element;
  };
});
```

---

### 5.2 Performance Timing

**Детекция:**
```javascript
// Анализ performance timing
const timing = performance.timing;

// В automation часто нереалистичные значения:
const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
const connectTime = timing.connectEnd - timing.connectStart;
const ttfb = timing.responseStart - timing.requestStart;

// Слишком быстрые или слишком медленные = suspicious
```

**Защита:**
```javascript
// Реалистичные timing значения
const realisticTiming = {
  dns: () => Math.random() * 50 + 10,    // 10-60ms
  connect: () => Math.random() * 100 + 30, // 30-130ms
  ttfb: () => Math.random() * 200 + 100   // 100-300ms
};

// Патчинг performance API
// (сложно, лучше использовать реальную сеть)
```

---

### 5.3 Battery API

**Детекция:**
```javascript
navigator.getBattery().then(battery => {
  // В headless/VM часто:
  // - charging: true
  // - level: 1.0
  // - Отсутствие изменений во времени
});
```

**Защита:**
```javascript
const originalGetBattery = navigator.getBattery;
navigator.getBattery = function() {
  return Promise.resolve({
    charging: Math.random() > 0.5,
    level: 0.5 + Math.random() * 0.5, // 50-100%
    chargingTime: Math.random() * 3600,
    dischargingTime: Math.random() * 10800,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  });
};
```

---

### 5.4 Media Devices

**Детекция:**
```javascript
navigator.mediaDevices.enumerateDevices().then(devices => {
  // В headless часто пустой массив
  if (devices.length === 0) {
    // Suspicious
  }
});
```

**Защита:**
```javascript
const originalEnumerateDevices =
  navigator.mediaDevices.enumerateDevices;

navigator.mediaDevices.enumerateDevices = function() {
  return Promise.resolve([
    {
      deviceId: 'default',
      kind: 'audioinput',
      label: 'Default - Microphone (Realtek High Definition Audio)',
      groupId: 'group1'
    },
    {
      deviceId: 'communications',
      kind: 'audioinput',
      label: 'Communications - Microphone (Realtek High Definition Audio)',
      groupId: 'group1'
    },
    {
      deviceId: 'device1',
      kind: 'videoinput',
      label: 'HD WebCam (04f2:b5ce)',
      groupId: 'group2'
    },
    {
      deviceId: 'default',
      kind: 'audiooutput',
      label: 'Default - Speakers (Realtek High Definition Audio)',
      groupId: 'group1'
    }
  ]);
};
```

---

## 📊 Сводная таблица приоритетов

| Метод детекции | Приоритет | Сложность защиты | Эффективность |
|----------------|-----------|------------------|---------------|
| Navigator.webdriver | 🔴 Критический | 🟢 Легко | ⭐⭐⭐⭐⭐ |
| CDP Variables | 🔴 Критический | 🟢 Легко | ⭐⭐⭐⭐⭐ |
| Chrome Runtime | 🔴 Критический | 🟢 Легко | ⭐⭐⭐⭐ |
| Canvas Fingerprint | 🟡 Высокий | 🟡 Средне | ⭐⭐⭐⭐⭐ |
| WebGL Fingerprint | 🟡 Высокий | 🟡 Средне | ⭐⭐⭐⭐⭐ |
| Mouse Behavior | 🟡 Высокий | 🔴 Сложно | ⭐⭐⭐⭐ |
| TLS Fingerprint | 🟡 Высокий | 🔴 Очень сложно | ⭐⭐⭐⭐⭐ |
| HTTP/2 Fingerprint | 🟢 Средний | 🔴 Очень сложно | ⭐⭐⭐⭐ |
| Audio Fingerprint | 🟢 Средний | 🟡 Средне | ⭐⭐⭐ |
| Battery API | 🟢 Низкий | 🟢 Легко | ⭐⭐ |

---

## 🎯 Рекомендации по реализации

### Порядок приоритетов:

1. **Фаза 1**: WebDriver эвазия (все критические)
2. **Фаза 2**: Fingerprinting (Canvas, WebGL, Audio)
3. **Фаза 3**: Behavioral simulation (Mouse, Keyboard, Scroll)
4. **Фаза 4**: Network-level (TLS, HTTP/2)
5. **Фаза 5**: Advanced & Edge cases

### Непрерывное тестирование:

Регулярно проверяйте на:
- bot.sannysoft.com
- arh.antoinevastel.com
- pixelscan.net
- Cloudflare challenges
- reCAPTCHA

---

*Этот документ обновляется по мере обнаружения новых методов детекции.*
