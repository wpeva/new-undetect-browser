# 🧪 Testing Guide - UndetectBrowser

Полное руководство по тестированию UndetectBrowser против различных методов детекции.

---

## 🚀 Быстрый тест

### 1. Установка и сборка

```bash
cd /home/user/new-undetect-browser

# Установить зависимости
npm install

# Собрать проект
npm run build
```

### 2. Запуск базового теста

```bash
# Запустить базовый пример
npx ts-node examples/basic-usage.ts
```

Это откроет браузер и перейдет на bot.sannysoft.com для проверки.

---

## 🔍 Ручное тестирование

### Тест 1: Bot.Sannysoft.com

```bash
npx ts-node examples/detection-test.ts
```

**Что проверяется:**
- ✓ navigator.webdriver
- ✓ window.chrome
- ✓ navigator.plugins
- ✓ navigator.languages
- ✓ CDP variables

**Ожидаемые результаты:**
- WebDriver: НЕ обнаружен
- Chrome: Присутствует
- Plugins: 3 плагина
- Languages: ['en-US', 'en']

### Тест 2: Are You Headless

Откройте браузер и перейдите на:
```
https://arh.antoinevastel.com/bots/areyouheadless
```

**Ожидаемый результат:**
```
You are NOT Chrome headless
```

### Тест 3: PixelScan

```
https://pixelscan.net/
```

**Проверьте:**
- Canvas fingerprint: должен быть уникальным и консистентным
- WebGL fingerprint: должен показывать реалистичный GPU
- Audio fingerprint: должен быть уникальным

### Тест 4: BrowserLeaks

```
https://browserleaks.com/javascript
```

**Проверьте все разделы:**
- WebDriver: false или undefined
- Chrome: должен быть object
- Plugins: минимум 3
- Screen: реалистичное разрешение

---

## 🤖 Автоматические тесты

### Unit тесты

```bash
# Запустить все unit тесты
npm run test:unit
```

**Тестируется:**
- WebDriverEvasionModule
- Удаление navigator.webdriver
- Добавление chrome.runtime
- Plugins array
- Languages array
- Удаление CDP variables

### Detection тесты

```bash
# Запустить detection тесты
npm run test:detection
```

**Внимание:** Эти тесты требуют установленного Chromium и могут занять время.

---

## 📊 Создание отчета

### Запуск полного набора тестов

```bash
# 1. Запустить detection тест с скриншотами
npx ts-node examples/detection-test.ts

# Скриншоты сохранятся в:
# - examples/screenshots/bot.sannysoft.png
# - examples/screenshots/are-you-headless.png
# - examples/screenshots/browserleaks-webrtc.png
```

### Проверка результатов

После теста проверьте:

1. **Console output:**
   ```
   ✅ PASS - Bot.Sannysoft
   ✅ PASS - Are You Headless
   ✅ PASS - BrowserLeaks - WebRTC

   Pass Rate: 100% (3/3)
   ```

2. **Скриншоты:**
   - Откройте скриншоты в `examples/screenshots/`
   - Убедитесь, что нет красных флагов детекции

---

## 🔬 Продвинутое тестирование

### Тест консистентности fingerprint

```typescript
// test-consistency.ts
import { UndetectBrowser } from './src/index';

async function testConsistency() {
  const undetect = new UndetectBrowser();

  // Создать профиль
  const profileId = await undetect.createProfile({ name: 'Test' });

  // Тест 1: Первый запуск
  const browser1 = await undetect.launch({ profileId });
  const page1 = await browser1.newPage();
  await page1.goto('https://browserleaks.com/canvas');
  const fp1 = await page1.evaluate(() => {
    // Получить canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Test', 2, 2);
    return canvas.toDataURL();
  });
  await browser1.close();

  // Тест 2: Второй запуск с тем же профилем
  const browser2 = await undetect.launch({ profileId });
  const page2 = await browser2.newPage();
  await page2.goto('https://browserleaks.com/canvas');
  const fp2 = await page2.evaluate(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Test', 2, 2);
    return canvas.toDataURL();
  });
  await browser2.close();

  // Fingerprints должны совпадать
  console.log('Fingerprints match:', fp1 === fp2);
  console.log('✅ Consistency test:', fp1 === fp2 ? 'PASS' : 'FAIL');
}

testConsistency();
```

### Тест против Cloudflare

```typescript
// test-cloudflare.ts
import { UndetectBrowser } from './src/index';

async function testCloudflare() {
  const undetect = new UndetectBrowser({
    stealth: { level: 'paranoid' }
  });

  const browser = await undetect.launch({ headless: false });
  const page = await browser.newPage();

  // Попробовать пройти Cloudflare challenge
  await page.goto('https://nowsecure.nl/', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Подождать прохождения challenge
  await page.waitForTimeout(10000);

  const title = await page.title();
  console.log('Page title:', title);

  // Сделать скриншот
  await page.screenshot({ path: 'cloudflare-test.png' });

  await browser.close();
}

testCloudflare();
```

---

## 📋 Checklist для полного тестирования

### Базовые тесты
- [ ] npm install прошел успешно
- [ ] npm run build прошел успешно
- [ ] Базовый пример запускается
- [ ] Браузер открывается без ошибок

### WebDriver Detection
- [ ] navigator.webdriver = undefined
- [ ] Нет cdc_ переменных
- [ ] window.chrome присутствует
- [ ] chrome.runtime определен
- [ ] chrome.app определен

### Fingerprinting
- [ ] Canvas fingerprint уникален
- [ ] Canvas fingerprint консистентен
- [ ] WebGL vendor реалистичен
- [ ] WebGL renderer реалистичен
- [ ] Screen properties корректны
- [ ] Hardware properties корректны

### Profile Management
- [ ] Создание профиля работает
- [ ] Сохранение cookies работает
- [ ] localStorage сохраняется
- [ ] Профиль загружается корректно
- [ ] Удаление профиля работает

### Detection Sites
- [ ] bot.sannysoft.com - PASS
- [ ] arh.antoinevastel.com - PASS
- [ ] browserleaks.com - PASS
- [ ] pixelscan.net - PASS

---

## 🐛 Troubleshooting

### Проблема: "Chromium not found"

**Решение:**
```bash
# Установить Chromium
sudo apt-get install chromium-browser

# Или использовать Puppeteer's Chromium
npx puppeteer browsers install chrome
```

### Проблема: "Tests timeout"

**Решение:**
```bash
# Увеличить timeout в Jest
# jest.config.js
testTimeout: 60000
```

### Проблема: "Detection still happening"

**Решение:**
```typescript
// Попробовать paranoid уровень
const undetect = new UndetectBrowser({
  stealth: { level: 'paranoid' }
});

// Проверить версию Chromium
const browser = await undetect.launch();
const version = await browser.version();
console.log('Chrome version:', version);
```

### Проблема: "Canvas fingerprint не консистентен"

**Проверьте:**
1. Используется ли один и тот же профиль
2. Не генерируется ли новый fingerprint каждый раз
3. Корректно ли сохраняется профиль

---

## 📈 Метрики успеха

### Целевые показатели Sprint 1:

| Метрика | Цель | Статус |
|---------|------|--------|
| WebDriver detection rate | 0% | ✅ |
| Chrome detection | 100% | ✅ |
| Plugins present | 3+ | ✅ |
| Fingerprint consistency | 100% | ✅ |
| Canvas protection | Active | ✅ |
| WebGL protection | Active | ✅ |

### Расширенные метрики (для будущих спринтов):

| Метрика | Текущее | Цель Sprint 2 |
|---------|---------|---------------|
| Cloudflare pass rate | TBD | 95%+ |
| reCAPTCHA score | TBD | 0.7+ |
| Behavioral detection | TBD | 0% |
| Network fingerprint | TBD | Matched |

---

## 📝 Отчетность

После тестирования создайте отчет:

```markdown
# Test Report - UndetectBrowser

Date: [DATE]
Tester: [NAME]
Version: Sprint 1

## Results

### Detection Tests
- bot.sannysoft.com: PASS/FAIL
- arh.antoinevastel.com: PASS/FAIL
- browserleaks.com: PASS/FAIL

### Unit Tests
- All tests: PASS/FAIL
- Coverage: X%

### Issues Found
1. [Issue description]
2. [Issue description]

### Screenshots
- Attached: X screenshots

### Conclusion
[Overall assessment]
```

---

## 🎯 Следующие шаги

После успешного тестирования Sprint 1:

1. ✅ Подтвердить все базовые функции работают
2. ✅ Документировать найденные проблемы
3. 🚀 Переходить к Sprint 2:
   - Behavioral simulation
   - Mouse/keyboard emulation
   - Network-level protection

---

**Успешного тестирования! 🚀**

Если обнаружите проблемы, создайте issue в GitHub с:
- Описанием проблемы
- Шагами для воспроизведения
- Скриншотами
- Версией Node.js и Chromium
