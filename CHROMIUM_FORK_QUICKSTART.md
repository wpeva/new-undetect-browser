# 🚀 Chromium Fork - Quick Start

## TL;DR - 3 команды для сборки

```bash
# 1. Setup Chromium (~1 hour, скачает ~20GB)
bash build-scripts/setup-chromium.sh

# 2. Apply anti-detection patches (~1 minute)
bash build-scripts/apply-patches.sh

# 3. Build Chromium (~2-6 hours)
bash build-scripts/build-chromium.sh
```

Готово! Ваш анти-детект браузер в `chromium/src/out/Release/chrome`

---

## 📋 Системные требования

**Минимум:**
- CPU: 8 cores
- RAM: 16GB
- Disk: 100GB SSD
- Time: 3-6 hours

**Рекомендуется:**
- CPU: 16+ cores
- RAM: 32GB
- Disk: 150GB SSD
- Time: 1-2 hours

**OS:**
- ✅ Linux (Ubuntu 20.04+, Debian 11+) - **РЕКОМЕНДУЕТСЯ**
- ✅ macOS (12.0+, Xcode 14+)
- ✅ Windows (10/11, Visual Studio 2022)

---

## 🐳 Быстрый старт с Docker (РЕКОМЕНДУЕТСЯ)

```bash
# 1. Build Docker image (one-time, ~30 min)
cd docker
docker-compose build

# 2. Start container
docker-compose up -d
docker-compose exec chromium-builder bash

# 3. Inside container: Fetch Chromium
mkdir chromium && cd chromium
fetch --nohooks --no-history chromium
cd src
./build/install-build-deps.sh --no-prompt
gclient sync

# 4. Apply patches
cd /home/chromium-builder
bash build-scripts/apply-patches.sh

# 5. Build
bash build-scripts/build-chromium.sh

# 6. Package (on host)
bash build-scripts/package-chromium.sh

# Result will be in: releases/linux/
```

---

## 🔧 Что делают патчи?

### 1. WebGL Fingerprint Protection
**Файл:** `patches/001-webgl-fingerprint-protection.patch`

**До патча:**
```javascript
gl.getParameter(gl.VENDOR)     // "Google Inc. (NVIDIA)"
gl.getParameter(gl.RENDERER)   // "ANGLE (NVIDIA GeForce RTX 3080)"
```

**После патча:**
```bash
export WEBGL_VENDOR="Intel Inc."
export WEBGL_RENDERER="Intel(R) UHD Graphics 630"
./chrome
# Теперь:
# gl.getParameter(gl.VENDOR)   → "Intel Inc."
# gl.getParameter(gl.RENDERER) → "Intel(R) UHD Graphics 630"
```

---

### 2. Canvas Noise Injection
**Файл:** `patches/002-canvas-noise-injection.patch`

**До патча:**
```javascript
canvas.toDataURL()  // Одинаковый hash каждый раз
// → Детектируемый fingerprint
```

**После патча:**
```bash
export CANVAS_NOISE_SEED=12345
./chrome
# canvas.toDataURL() → Уникальный hash с consistent noise
# → Невозможно отследить
```

---

### 3. CDP Detection Removal
**Файл:** `patches/008-cdp-detection-removal.patch`

**До патча:**
```javascript
window.cdc_adoQpoasnfa76pfcZLmcfl_Array  // exists - DETECTED!
window.__chrome_asyncScriptInfo          // exists - DETECTED!
```

**После патча:**
```bash
export HIDE_CDP_DETECTION=true
./chrome
# window.cdc_* → undefined
# window.__chrome_* → undefined
# → Невидимый для детекторов
```

---

## 🧪 Тестирование

### Запуск с анти-детектом:
```bash
cd chromium/src/out/Release

# Full anti-detection mode
WEBGL_VENDOR="Intel Inc." \
WEBGL_RENDERER="Intel(R) UHD Graphics 630" \
CANVAS_NOISE_SEED="$(date +%s)" \
HIDE_CDP_DETECTION="true" \
REMOVE_CDP_VARIABLES="true" \
INJECT_CHROME_RUNTIME="true" \
./chrome
```

### Проверка на детекторах:

1. **pixelscan.net** - Должно быть 9.5/10 ✅
2. **creepjs.com** - Trust Score >70% ✅
3. **browserleaks.com** - Уникальный Canvas ✅
4. **sannysoft.com** - Все тесты зеленые ✅

---

## 📦 Дистрибуция

### Упаковать для дистрибуции:
```bash
bash build-scripts/package-chromium.sh
```

Результат:
- **Linux**: `releases/linux/undetect-chromium-*.tar.gz`
- **macOS**: `releases/macos/undetect-chromium-*.zip` + `.dmg`
- **Windows**: `releases/windows/undetect-chromium-*.zip`

### Включено в пакет:
- ✅ Chrome binary с патчами
- ✅ Launcher script с env vars
- ✅ README с инструкциями
- ✅ Все необходимые библиотеки

---

## 🔄 Обновление патчей

### Создать новый патч:

```bash
# 1. Сделать изменения в chromium/src
cd chromium/src
# Edit files...

# 2. Создать patch
git diff > ../../../patches/011-my-new-patch.patch

# 3. Проверить patch
git apply --check ../../../patches/011-my-new-patch.patch

# 4. Добавить описание в начало патча
# (см. существующие патчи как пример)
```

---

## ⚡ Оптимизация сборки

### Ускорить сборку:

```bash
# 1. Использовать все CPU cores
NUM_JOBS=$(nproc) bash build-scripts/build-chromium.sh

# 2. Debug build (быстрее, но больше размер)
BUILD_TYPE=Debug bash build-scripts/build-chromium.sh

# 3. Incremental builds (после первой сборки)
cd chromium/src
ninja -C out/Release chrome  # Пересобрать только измененные файлы

# 4. Component build (еще быстрее для разработки)
gn gen out/Debug --args='is_component_build=true'
ninja -C out/Debug chrome
```

---

## 🐛 Troubleshooting

### "Out of memory during build"
```bash
# Уменьшить параллельные jobs
NUM_JOBS=4 bash build-scripts/build-chromium.sh

# Или увеличить swap
sudo fallocate -l 32G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### "Patch failed to apply"
```bash
cd chromium/src
git status  # Проверить uncommitted changes
git reset --hard origin/main  # Сбросить к чистому состоянию
cd ../../
bash build-scripts/apply-patches.sh  # Попробовать снова
```

### "Build failed with errors"
```bash
# 1. Проверить зависимости
cd chromium/src
./build/install-build-deps.sh --no-prompt

# 2. Полностью пересобрать
rm -rf out/Release
bash ../../build-scripts/build-chromium.sh

# 3. Проверить логи
ninja -C out/Release chrome 2>&1 | tee build.log
```

---

## 📚 Дополнительная документация

- **Полный гайд**: [CHROMIUM_FORK_GUIDE.md](CHROMIUM_FORK_GUIDE.md)
- **Патчи**: [patches/README.md](patches/README.md) (создать)
- **Официальная docs**: https://www.chromium.org/developers/

---

## 🎯 Что дальше?

1. ✅ **Собрали браузер** - поздравляем!
2. 🧪 **Протестировали** на детекторах
3. 📦 **Упаковали** для дистрибуции
4. 🚀 **Используйте** с Puppeteer/Playwright
5. 🔧 **Создавайте** новые патчи по необходимости

**Теперь у вас есть браузер enterprise-уровня с полной невидимостью! 🎉**

---

**Вопросы?** Читайте [CHROMIUM_FORK_GUIDE.md](CHROMIUM_FORK_GUIDE.md) или создайте Issue на GitHub.
