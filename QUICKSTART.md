# ⚡ Quick Start - UndetectBrowser

5-минутный старт для тестирования UndetectBrowser

---

## 📦 Шаг 1: Установка (2 минуты)

```bash
cd /home/user/new-undetect-browser

# Установить зависимости
npm install

# Собрать проект
npm run build
```

---

## 🚀 Шаг 2: Запуск первого теста (1 минута)

```bash
# Запустить базовый пример
npx ts-node examples/basic-usage.ts
```

**Что произойдет:**
1. Откроется Chrome браузер
2. Перейдет на https://bot.sannysoft.com/
3. Подождет 10 секунд для проверки
4. Сделает скриншот
5. Покажет результаты в консоли

**Ожидаемый результат:**
```
✅ Browser launched successfully
✅ Page loaded
Navigator.webdriver: undefined  ✓
Has window.chrome: true  ✓
Plugins count: 3  ✓
✅ Screenshot saved
```

---

## 🧪 Шаг 3: Полный тест детекции (2 минуты)

```bash
# Запустить тест против нескольких сайтов
npx ts-node examples/detection-test.ts
```

**Тестирует:**
- Bot.Sannysoft
- Are You Headless
- BrowserLeaks

**Ожидаемый результат:**
```
📊 SUMMARY
==========================================================
✅ PASS - Bot.Sannysoft
✅ PASS - Are You Headless
✅ PASS - BrowserLeaks - WebRTC

Pass Rate: 100% (3/3)
==========================================================
```

---

## 🔍 Проверка результатов

### Скриншоты
Проверьте сохраненные скриншоты:
```bash
ls -lh examples/screenshots/
```

Вы увидите:
- `basic-usage.png`
- `bot.sannysoft.png`
- `are-you-headless.png`
- `browserleaks-webrtc.png`

### Консоль
В консоли должно быть:
- ✅ Все тесты PASSED
- ✅ Нет ошибок
- ✅ WebDriver НЕ обнаружен

---

## 💡 Использование в своем коде

Создайте файл `my-test.ts`:

```typescript
import { UndetectBrowser } from './src/index';

async function main() {
  // Создать браузер
  const undetect = new UndetectBrowser({
    stealth: { level: 'advanced' }
  });

  // Запустить
  const browser = await undetect.launch({
    headless: false  // false = видимый браузер
  });

  // Новая страница
  const page = await browser.newPage();

  // Ваш код здесь!
  await page.goto('https://example.com');
  
  console.log('Title:', await page.title());

  // Закрыть
  await browser.close();
}

main();
```

Запустить:
```bash
npx ts-node my-test.ts
```

---

## 📚 Дальнейшее изучение

1. **Управление профилями:**
   ```bash
   npx ts-node examples/profile-management.ts
   ```

2. **Документация:**
   - [Getting Started](GETTING_STARTED.md) - Полное руководство
   - [Testing Guide](TESTING_GUIDE.md) - Детальное тестирование
   - [Sprint 1 Report](SPRINT_1_COMPLETED.md) - Что реализовано

3. **Архитектура:**
   - [Technical Architecture](TECHNICAL_ARCHITECTURE.md)
   - [Implementation Plan](UNDETECT_BROWSER_PLAN.md)
   - [Detection Methods](DETECTION_METHODS_ANALYSIS.md)

---

## ❓ Проблемы?

### Chromium не найден
```bash
sudo apt-get install chromium-browser
```

### Ошибки при npm install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Тесты не проходят
```bash
# Попробовать уровень paranoid
# Изменить в примере: { level: 'paranoid' }
```

---

## ✅ Checklist

После выполнения Quick Start у вас должно быть:

- [x] npm install выполнен
- [x] npm run build выполнен
- [x] Базовый пример запущен
- [x] Браузер открылся
- [x] Скриншоты созданы
- [x] Все тесты PASSED
- [x] WebDriver не обнаружен

---

## 🎯 Результаты

Если все прошло успешно, вы теперь имеете:

✅ Рабочий undetectable браузер
✅ Защита от WebDriver детекции
✅ Fingerprint protection
✅ Profile management система
✅ Готовые примеры кода

**Поздравляем! Вы готовы к использованию UndetectBrowser! 🎉**

---

## 🚀 Следующие шаги

1. Изучить [GETTING_STARTED.md](GETTING_STARTED.md) для продвинутого использования
2. Прочитать [TESTING_GUIDE.md](TESTING_GUIDE.md) для полного тестирования
3. Адаптировать под свои нужды
4. Дать feedback через GitHub Issues

---

**Время выполнения: ~5 минут**
**Сложность: Легко**
**Результат: Полностью функциональный undetectable браузер**
