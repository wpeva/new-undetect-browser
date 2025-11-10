# 🔬 Chromium Fork Guide - Enterprise Anti-Detection Browser

## 📋 Содержание
1. [Введение](#введение)
2. [Архитектура](#архитектура)
3. [Требования к системе](#требования-к-системе)
4. [Quick Start](#quick-start)
5. [Патчи на уровне C++](#патчи-на-уровне-c)
6. [Сборка Chromium](#сборка-chromium)
7. [Автоматизация](#автоматизация)
8. [Дистрибуция](#дистрибуция)

---

## 🎯 Введение

**Chromium Fork** - это собственная версия браузера Chromium с глубокими патчами на уровне исходного кода (C++), которые делают детекцию **физически невозможной**.

### Зачем нужен форк Chromium?

**JavaScript-уровень** (текущая реализация):
- ✅ Быстро внедрить
- ✅ Легко поддерживать
- ⚠️ Детектируемо через Proxy detection
- ⚠️ Function.prototype.toString() показывает патчи
- ⚠️ Property descriptors можно проверить

**C++-уровень** (Chromium fork):
- ✅ **Невозможно** детектировать
- ✅ Нативное поведение браузера
- ✅ Нет Proxy detection
- ✅ Полный контроль над Blink/V8
- ⚠️ Сложно внедрить
- ⚠️ Требует expertise в C++
- ⚠️ Долгая сборка (2-6 часов)

### Что можно патчить на C++ уровне?

1. **WebGL Fingerprinting** - изменить Blink rendering engine
2. **Canvas Fingerprinting** - патчить Skia (2D graphics library)
3. **Audio Context** - патчить Web Audio API в Blink
4. **navigator properties** - патчить V8 JavaScript engine
5. **WebRTC** - патчить WebRTC stack
6. **Performance API** - изменить timing resolution
7. **Client Rects** - патчить layout engine
8. **CDP Detection** - удалить Chrome DevTools Protocol маркеры

---

## 🏗️ Архитектура

```
undetect-browser/
├── chromium/                    # Chromium fork (submodule)
│   ├── src/                     # Chromium source code
│   ├── .gclient                 # Chromium build config
│   └── out/                     # Build output
│
├── patches/                     # Наши патчи для Chromium
│   ├── 001-webgl-fingerprint-protection.patch
│   ├── 002-canvas-noise-injection.patch
│   ├── 003-audio-context-spoofing.patch
│   ├── 004-navigator-properties.patch
│   ├── 005-webrtc-ip-protection.patch
│   ├── 006-performance-api-noise.patch
│   ├── 007-client-rects-noise.patch
│   ├── 008-cdp-detection-removal.patch
│   ├── 009-timezone-locale-spoofing.patch
│   └── 010-chrome-runtime-evasion.patch
│
├── build-scripts/               # Скрипты сборки
│   ├── setup-chromium.sh        # Начальная настройка
│   ├── apply-patches.sh         # Применить все патчи
│   ├── build-chromium.sh        # Собрать Chromium
│   ├── package-chromium.sh      # Упаковать для дистрибуции
│   └── verify-build.sh          # Проверить сборку
│
├── docker/                      # Docker для изолированной сборки
│   ├── Dockerfile.chromium      # Build environment
│   ├── docker-compose.yml       # Orchestration
│   └── build-in-docker.sh       # Build в контейнере
│
├── ci/                          # CI/CD для автоматической сборки
│   ├── github-actions.yml       # GitHub Actions (потребует self-hosted runner)
│   ├── jenkins-pipeline.groovy  # Jenkins pipeline (enterprise)
│   └── gitlab-ci.yml            # GitLab CI (alternative)
│
├── docs/                        # Документация
│   ├── BUILDING.md              # Инструкции по сборке
│   ├── PATCHING.md              # Как создавать патчи
│   ├── DEBUGGING.md             # Отладка патчей
│   └── CONTRIBUTING.md          # Contribution guide
│
└── releases/                    # Готовые билды
    ├── linux/
    ├── windows/
    └── macos/
```

---

## 💻 Требования к системе

### Минимальные требования для сборки Chromium:

**Linux (рекомендуется):**
- CPU: 8+ cores (16+ рекомендуется)
- RAM: 16GB minimum, **32GB рекомендуется**
- Disk: 100GB SSD (быстрая сборка), 200GB HDD (медленная)
- OS: Ubuntu 20.04+, Debian 11+, Fedora 35+

**Windows:**
- CPU: 8+ cores
- RAM: 32GB
- Disk: 150GB SSD
- OS: Windows 10/11 (Visual Studio 2022)

**macOS:**
- CPU: Apple Silicon M1/M2 или Intel i7+
- RAM: 16GB (32GB рекомендуется)
- Disk: 100GB SSD
- OS: macOS 12.0+, Xcode 14+

### Время сборки:

| Система | Конфигурация | Debug Build | Release Build |
|---------|--------------|-------------|---------------|
| Linux (32 cores, 64GB RAM) | High-end server | 30 min | 1 hour |
| Linux (16 cores, 32GB RAM) | Workstation | 1 hour | 2 hours |
| Linux (8 cores, 16GB RAM) | Desktop | 2-3 hours | 4-6 hours |
| Windows (16 cores, 32GB RAM) | Workstation | 2 hours | 3-4 hours |
| macOS M2 Max (12 cores, 32GB) | MacBook Pro | 1.5 hours | 2.5 hours |

---

## 🚀 Quick Start

### Шаг 1: Установка depot_tools (Chromium build tools)

```bash
# Linux / macOS
cd ~
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
echo 'export PATH="$HOME/depot_tools:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Проверка
gclient --version
```

### Шаг 2: Скачать Chromium source code

```bash
cd /path/to/new-undetect-browser
mkdir chromium
cd chromium

# Fetch Chromium (это займет 30-60 минут, ~20GB download)
fetch --nohooks chromium

# Sync dependencies
cd src
gclient sync

# Install build dependencies (Linux)
./build/install-build-deps.sh

# На этом этапе у вас ~40GB Chromium source code
```

### Шаг 3: Применить наши патчи

```bash
cd /path/to/new-undetect-browser
bash build-scripts/apply-patches.sh
```

### Шаг 4: Настроить сборку

```bash
cd chromium/src

# Создать Release build config
gn gen out/Release --args='
  is_debug=false
  is_official_build=true
  chrome_pgo_phase=0
  symbol_level=0
  enable_nacl=false
  proprietary_codecs=true
  ffmpeg_branding="Chrome"
'

# Debug build (быстрее собирается, для разработки)
gn gen out/Debug --args='
  is_debug=true
  symbol_level=1
  enable_nacl=false
'
```

### Шаг 5: Собрать Chromium

```bash
# Release build (2-6 часов)
ninja -C out/Release chrome

# Debug build (1-3 часа)
ninja -C out/Debug chrome

# Собрать только нужные компоненты (быстрее)
ninja -C out/Release chrome content_shell

# Параллельная сборка (использовать все CPU cores)
ninja -C out/Release -j $(nproc) chrome
```

### Шаг 6: Запустить собранный браузер

```bash
# Linux
./out/Release/chrome

# Windows
out\Release\chrome.exe

# macOS
out/Release/Chromium.app/Contents/MacOS/Chromium
```

---

## 🔧 Патчи на уровне C++

### 1. WebGL Fingerprint Protection

**Файл**: `patches/001-webgl-fingerprint-protection.patch`

**Цель**: Патчить Blink rendering engine для изменения WebGL vendor/renderer

**Файлы Chromium для патча:**
- `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`
- `gpu/command_buffer/service/webgl_rendering_context.cc`

**Патч:**
```cpp
// File: third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc

// BEFORE:
String WebGLRenderingContextBase::getParameter(GLenum pname) {
  if (pname == GL_VENDOR) {
    return "Google Inc. (NVIDIA)";
  }
  if (pname == GL_RENDERER) {
    return "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080)";
  }
}

// AFTER (with our patch):
String WebGLRenderingContextBase::getParameter(GLenum pname) {
  if (pname == GL_VENDOR) {
    // Read from environment variable or config file
    const char* custom_vendor = std::getenv("WEBGL_VENDOR");
    if (custom_vendor) {
      return String::FromUTF8(custom_vendor);
    }
    return "Intel Inc."; // Default spoofed value
  }
  if (pname == GL_RENDERER) {
    const char* custom_renderer = std::getenv("WEBGL_RENDERER");
    if (custom_renderer) {
      return String::FromUTF8(custom_renderer);
    }
    return "Intel(R) UHD Graphics 630"; // Default
  }
}
```

**Конфигурация** (через environment variables):
```bash
export WEBGL_VENDOR="Intel Inc."
export WEBGL_RENDERER="Intel(R) UHD Graphics 630"
./chrome
```

---

### 2. Canvas Fingerprint Protection (Skia)

**Файл**: `patches/002-canvas-noise-injection.patch`

**Цель**: Патчить Skia (2D graphics library) для добавления noise в canvas

**Файлы Chromium:**
- `third_party/skia/src/core/SkCanvas.cpp`
- `third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc`

**Патч:**
```cpp
// File: third_party/skia/src/core/SkCanvas.cpp

#include <random>
#include <cmath>

// Add seeded noise function
void addCanvasNoise(SkBitmap& bitmap, uint64_t seed) {
  std::mt19937_64 rng(seed);
  std::uniform_real_distribution<double> dist(-1.0, 1.0);

  for (int y = 0; y < bitmap.height(); y++) {
    for (int x = 0; x < bitmap.width(); x++) {
      SkColor color = bitmap.getColor(x, y);

      double noise = dist(rng) * 0.001; // Minimal noise

      uint8_t r = SkColorGetR(color) + (uint8_t)(noise * 255);
      uint8_t g = SkColorGetG(color) + (uint8_t)(noise * 255);
      uint8_t b = SkColorGetB(color) + (uint8_t)(noise * 255);
      uint8_t a = SkColorGetA(color);

      bitmap.setColor(x, y, SkColorSetARGB(a, r, g, b));
    }
  }
}

// In toDataURL() method:
void CanvasRenderingContext2D::toDataURL(const String& type, double quality) {
  SkBitmap bitmap = GetBitmap();

  // Apply noise if enabled
  const char* canvas_seed = std::getenv("CANVAS_NOISE_SEED");
  if (canvas_seed) {
    uint64_t seed = std::stoull(canvas_seed);
    addCanvasNoise(bitmap, seed);
  }

  // Continue with normal encoding
  // ...
}
```

---

### 3. Audio Context Fingerprint Protection

**Файл**: `patches/003-audio-context-spoofing.patch`

**Цель**: Патчить Web Audio API в Blink

**Файлы:**
- `third_party/blink/renderer/modules/webaudio/audio_context.cc`
- `third_party/blink/renderer/modules/webaudio/oscillator_node.cc`

**Патч:**
```cpp
// File: third_party/blink/renderer/modules/webaudio/oscillator_node.cc

#include <cmath>

// Override frequency with noise
void OscillatorNode::setFrequency(float frequency) {
  const char* audio_seed = std::getenv("AUDIO_NOISE_SEED");

  if (audio_seed) {
    uint64_t seed = std::stoull(audio_seed);
    double noise = sin(seed) * 0.0001; // Minimal frequency shift
    frequency_ = frequency + noise;
  } else {
    frequency_ = frequency;
  }
}

// Override getChannelData to add noise
void AudioBuffer::getChannelData(unsigned channel_index, float* destination, size_t length) {
  // Get original data
  GetChannelDataInternal(channel_index, destination, length);

  // Add noise if enabled
  const char* audio_seed = std::getenv("AUDIO_NOISE_SEED");
  if (audio_seed) {
    uint64_t seed = std::stoull(audio_seed);
    for (size_t i = 0; i < length; i++) {
      double noise = sin(seed + i) * 0.000001;
      destination[i] += noise;
    }
  }
}
```

---

### 4. Navigator Properties Spoofing (V8)

**Файл**: `patches/004-navigator-properties.patch`

**Цель**: Изменить navigator.* properties на уровне V8 engine

**Файлы:**
- `third_party/blink/renderer/core/frame/navigator.cc`
- `v8/src/objects/js-objects.cc`

**Патч:**
```cpp
// File: third_party/blink/renderer/core/frame/navigator.cc

String Navigator::userAgent() const {
  // Read custom user agent from environment
  const char* custom_ua = std::getenv("NAVIGATOR_USER_AGENT");
  if (custom_ua) {
    return String::FromUTF8(custom_ua);
  }

  // Default behavior
  return GetFrame()->Loader().UserAgent();
}

String Navigator::platform() const {
  const char* custom_platform = std::getenv("NAVIGATOR_PLATFORM");
  if (custom_platform) {
    return String::FromUTF8(custom_platform);
  }
  return "Win32"; // Default
}

int Navigator::hardwareConcurrency() const {
  const char* custom_cores = std::getenv("NAVIGATOR_HARDWARE_CONCURRENCY");
  if (custom_cores) {
    return atoi(custom_cores);
  }
  return 8; // Default
}

double Navigator::deviceMemory() const {
  const char* custom_memory = std::getenv("NAVIGATOR_DEVICE_MEMORY");
  if (custom_memory) {
    return atof(custom_memory);
  }
  return 8.0; // Default 8GB
}

// КРИТИЧНО: Object.defineProperty protection
// Убрать возможность проверки дескрипторов
bool Navigator::IsPropertyDescriptorDetectable(const String& property_name) {
  return false; // Всегда возвращать false
}
```

---

### 5. WebRTC IP Leak Protection (Native)

**Файл**: `patches/005-webrtc-ip-protection.patch`

**Цель**: Блокировать утечки IP на уровне WebRTC stack

**Файлы:**
- `third_party/webrtc/pc/peer_connection.cc`
- `third_party/webrtc/p2p/base/basic_packet_socket_factory.cc`

**Патч:**
```cpp
// File: third_party/webrtc/pc/peer_connection.cc

// Override ICE candidate gathering
void PeerConnection::OnIceCandidate(const IceCandidateInterface* candidate) {
  std::string candidate_str;
  candidate->ToString(&candidate_str);

  // Filter local IP addresses
  const char* block_local_ips = std::getenv("WEBRTC_BLOCK_LOCAL_IPS");
  if (block_local_ips && strcmp(block_local_ips, "true") == 0) {
    // Check if candidate contains local IP (192.168.*, 10.*, etc.)
    if (candidate_str.find("192.168.") != std::string::npos ||
        candidate_str.find("10.") != std::string::npos ||
        candidate_str.find("172.16.") != std::string::npos ||
        candidate_str.find(".local") != std::string::npos) {
      // Block this candidate
      return;
    }
  }

  // Only relay candidates
  const char* relay_only = std::getenv("WEBRTC_RELAY_ONLY");
  if (relay_only && strcmp(relay_only, "true") == 0) {
    if (candidate_str.find("typ relay") == std::string::npos) {
      // Not a relay candidate, block it
      return;
    }
  }

  // Pass to original handler
  observer_->OnIceCandidate(candidate);
}
```

---

### 6. Performance API Noise

**Файл**: `patches/006-performance-api-noise.patch`

**Цель**: Добавить noise в Performance.now() и timing

**Файлы:**
- `third_party/blink/renderer/core/timing/performance.cc`

**Патч:**
```cpp
// File: third_party/blink/renderer/core/timing/performance.cc

#include <random>

DOMHighResTimeStamp Performance::now() const {
  DOMHighResTimeStamp time = MonotonicTimeToZeroBasedDocumentTime(base::TimeTicks::Now());

  // Add noise to prevent fingerprinting
  const char* perf_noise = std::getenv("PERFORMANCE_NOISE_ENABLED");
  if (perf_noise && strcmp(perf_noise, "true") == 0) {
    static std::mt19937_64 rng(std::random_device{}());
    static std::uniform_real_distribution<double> dist(-0.01, 0.01);

    double noise = dist(rng);
    time += noise;
  }

  return time;
}

// Reduce timing precision to prevent fingerprinting
DOMHighResTimeStamp Performance::ClampTimeResolution(DOMHighResTimeStamp time) const {
  // Round to 0.1ms instead of 0.005ms (default)
  const char* time_precision = std::getenv("PERFORMANCE_TIME_PRECISION");
  double precision = 0.1; // Default 0.1ms

  if (time_precision) {
    precision = atof(time_precision);
  }

  return floor(time / precision) * precision;
}
```

---

### 7. Client Rects Noise

**Файл**: `patches/007-client-rects-noise.patch`

**Цель**: Добавить noise в getBoundingClientRect()

**Файлы:**
- `third_party/blink/renderer/core/dom/element.cc`
- `third_party/blink/renderer/core/layout/layout_object.cc`

**Патч:**
```cpp
// File: third_party/blink/renderer/core/dom/element.cc

#include <cmath>
#include <random>

DOMRectReadOnly* Element::getBoundingClientRect() {
  DOMRect* rect = DOMRect::Create();

  // Get original rect
  LayoutObject* layout_object = GetLayoutObject();
  if (!layout_object) {
    return rect;
  }

  PhysicalRect physical_rect = layout_object->PhysicalBoundingBox();

  // Add noise if enabled
  const char* rect_noise = std::getenv("CLIENT_RECTS_NOISE_SEED");
  if (rect_noise) {
    uint64_t seed = std::stoull(rect_noise);
    std::mt19937_64 rng(seed);
    std::uniform_real_distribution<double> dist(-0.1, 0.1);

    double noise_x = dist(rng);
    double noise_y = dist(rng);
    double noise_width = dist(rng) * 0.5;
    double noise_height = dist(rng) * 0.5;

    rect->setX(physical_rect.X() + noise_x);
    rect->setY(physical_rect.Y() + noise_y);
    rect->setWidth(physical_rect.Width() + noise_width);
    rect->setHeight(physical_rect.Height() + noise_height);
  } else {
    rect->setX(physical_rect.X());
    rect->setY(physical_rect.Y());
    rect->setWidth(physical_rect.Width());
    rect->setHeight(physical_rect.Height());
  }

  return rect;
}
```

---

### 8. CDP (Chrome DevTools Protocol) Detection Removal

**Файл**: `patches/008-cdp-detection-removal.patch`

**Цель**: Удалить CDP маркеры, которые выдают автоматизацию

**Файлы:**
- `content/browser/devtools/devtools_agent_host_impl.cc`
- `third_party/blink/renderer/core/inspector/inspector_emulation_agent.cc`

**Патч:**
```cpp
// File: content/browser/devtools/devtools_agent_host_impl.cc

// Remove CDP-specific variables
void DevToolsAgentHostImpl::AttachClient(DevToolsAgentHostClient* client) {
  // BEFORE: Sets window.__IS_DEVTOOLS_OPEN = true

  // AFTER: Don't set any variables
  // Do nothing - keep browser undetectable

  // Hide devtools detection
  const char* hide_devtools = std::getenv("HIDE_DEVTOOLS_DETECTION");
  if (hide_devtools && strcmp(hide_devtools, "true") == 0) {
    // Don't expose any CDP markers
    return;
  }

  // Original behavior (only if not hiding)
  AttachClientInternal(client);
}

// File: third_party/blink/renderer/core/inspector/inspector_emulation_agent.cc

// Remove window.cdc_* variables
void InspectorEmulationAgent::SetDeviceMetricsOverride() {
  // BEFORE: Adds window.cdc_adoQpoasnfa76pfcZLmcfl_Array

  // AFTER: Don't add any cdc_ variables
  const char* remove_cdc_vars = std::getenv("REMOVE_CDP_VARIABLES");
  if (remove_cdc_vars && strcmp(remove_cdc_vars, "true") == 0) {
    // Skip adding CDP detection variables
    return;
  }

  // Original behavior
  SetDeviceMetricsOverrideInternal();
}
```

---

### 9. Timezone & Locale Native Spoofing

**Файл**: `patches/009-timezone-locale-spoofing.patch`

**Файлы:**
- `base/i18n/time_formatting.cc`
- `third_party/icu/source/i18n/timezone.cpp`

**Патч:**
```cpp
// File: base/i18n/time_formatting.cc

#include "base/environment.h"

std::string GetDefaultTimezone() {
  // Read custom timezone from environment
  std::string custom_tz;
  base::Environment::Create()->GetVar("CUSTOM_TIMEZONE", &custom_tz);

  if (!custom_tz.empty()) {
    return custom_tz; // e.g., "America/New_York"
  }

  // Default system timezone
  return base::GetSystemTimezone();
}

// File: third_party/icu/source/i18n/timezone.cpp

TimeZone* TimeZone::createDefault() {
  // Check for custom timezone override
  const char* custom_tz = getenv("CUSTOM_TIMEZONE");
  if (custom_tz) {
    UnicodeString tz_id(custom_tz);
    return TimeZone::createTimeZone(tz_id);
  }

  // Default behavior
  return TimeZone::detectHostTimeZone();
}
```

---

### 10. Chrome Runtime Evasion

**Файл**: `patches/010-chrome-runtime-evasion.patch`

**Цель**: Сделать chrome.runtime доступным даже без расширений

**Файлы:**
- `chrome/renderer/chrome_render_frame_observer.cc`
- `extensions/renderer/script_context.cc`

**Патч:**
```cpp
// File: chrome/renderer/chrome_render_frame_observer.cc

void ChromeRenderFrameObserver::DidCreateScriptContext(v8::Local<v8::Context> context) {
  // Always inject chrome.runtime (even without extensions)
  const char* inject_runtime = std::getenv("INJECT_CHROME_RUNTIME");
  if (inject_runtime && strcmp(inject_runtime, "true") == 0) {
    v8::Isolate* isolate = context->GetIsolate();
    v8::HandleScope handle_scope(isolate);

    // Create fake chrome.runtime object
    v8::Local<v8::Object> chrome = v8::Object::New(isolate);
    v8::Local<v8::Object> runtime = v8::Object::New(isolate);

    // Add fake properties
    runtime->Set(
      context,
      v8::String::NewFromUtf8(isolate, "id").ToLocalChecked(),
      v8::String::NewFromUtf8(isolate, "fake-extension-id").ToLocalChecked()
    );

    chrome->Set(
      context,
      v8::String::NewFromUtf8(isolate, "runtime").ToLocalChecked(),
      runtime
    );

    context->Global()->Set(
      context,
      v8::String::NewFromUtf8(isolate, "chrome").ToLocalChecked(),
      chrome
    );
  }
}
```

---

## 🐳 Docker Build Environment

**Файл**: `docker/Dockerfile.chromium`

```dockerfile
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    curl \
    lsb-release \
    sudo \
    vim \
    build-essential \
    ninja-build \
    pkg-config \
    libglib2.0-dev \
    libgtk-3-dev \
    libdbus-1-dev \
    libx11-dev \
    libxcomposite-dev \
    libxcursor-dev \
    libxdamage-dev \
    libxi-dev \
    libxtst-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Create build user (don't build as root)
RUN useradd -m -s /bin/bash chromium-builder && \
    echo "chromium-builder ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER chromium-builder
WORKDIR /home/chromium-builder

# Install depot_tools
RUN git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
ENV PATH="/home/chromium-builder/depot_tools:${PATH}"

# Fetch Chromium (this will take a while - ~20GB)
RUN mkdir chromium && cd chromium && \
    fetch --nohooks --no-history chromium

# Sync dependencies
RUN cd chromium/src && gclient sync

# Install additional build dependencies
RUN cd chromium/src && sudo ./build/install-build-deps.sh --no-prompt

# Copy patches
COPY --chown=chromium-builder:chromium-builder patches/ /home/chromium-builder/patches/

# Apply patches script
COPY --chown=chromium-builder:chromium-builder build-scripts/apply-patches.sh /home/chromium-builder/
RUN chmod +x /home/chromium-builder/apply-patches.sh

# Build script
COPY --chown=chromium-builder:chromium-builder build-scripts/build-chromium.sh /home/chromium-builder/
RUN chmod +x /home/chromium-builder/build-chromium.sh

WORKDIR /home/chromium-builder/chromium/src

# Default command
CMD ["/bin/bash"]
```

**Использование Docker:**
```bash
# Build Docker image (one-time setup, ~30-60 min)
docker build -t undetect-chromium-builder -f docker/Dockerfile.chromium .

# Run container and build Chromium
docker run -it --rm \
  -v $(pwd)/chromium/src:/home/chromium-builder/chromium/src \
  -v $(pwd)/releases:/home/chromium-builder/releases \
  undetect-chromium-builder \
  bash -c "cd /home/chromium-builder && ./apply-patches.sh && ./build-chromium.sh"

# The build will be in releases/ folder
```

---

## ⚙️ Build Scripts

### apply-patches.sh

```bash
#!/bin/bash

set -e

PATCHES_DIR="$(dirname "$0")/../patches"
CHROMIUM_SRC="${CHROMIUM_SRC:-$HOME/chromium/src}"

cd "$CHROMIUM_SRC"

echo "Applying Chromium patches from $PATCHES_DIR..."

# Apply each patch in order
for patch in "$PATCHES_DIR"/*.patch; do
  echo "Applying $(basename "$patch")..."
  git apply --check "$patch" || {
    echo "ERROR: Patch $(basename "$patch") cannot be applied cleanly"
    exit 1
  }
  git apply "$patch"
  echo "✅ Applied $(basename "$patch")"
done

echo "✅ All patches applied successfully!"
```

### build-chromium.sh

```bash
#!/bin/bash

set -e

CHROMIUM_SRC="${CHROMIUM_SRC:-$HOME/chromium/src}"
BUILD_TYPE="${BUILD_TYPE:-Release}"
NUM_JOBS="${NUM_JOBS:-$(nproc)}"

cd "$CHROMIUM_SRC"

echo "Building Chromium ($BUILD_TYPE)..."
echo "Using $NUM_JOBS parallel jobs"

# Create build config
gn gen "out/$BUILD_TYPE" --args="
  is_debug=false
  is_official_build=true
  chrome_pgo_phase=0
  symbol_level=0
  enable_nacl=false
  proprietary_codecs=true
  ffmpeg_branding=\"Chrome\"
  is_component_build=false
  use_custom_libcxx=true
  treat_warnings_as_errors=false
"

# Build Chrome
ninja -C "out/$BUILD_TYPE" -j "$NUM_JOBS" chrome

echo "✅ Build completed successfully!"
echo "Binary location: $CHROMIUM_SRC/out/$BUILD_TYPE/chrome"
```

### package-chromium.sh

```bash
#!/bin/bash

set -e

CHROMIUM_SRC="${CHROMIUM_SRC:-$HOME/chromium/src}"
BUILD_TYPE="${BUILD_TYPE:-Release}"
RELEASE_DIR="$(dirname "$0")/../releases"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
VERSION="$(cat $CHROMIUM_SRC/chrome/VERSION | head -1)"

cd "$CHROMIUM_SRC/out/$BUILD_TYPE"

echo "Packaging Chromium for $PLATFORM..."

# Create release directory
mkdir -p "$RELEASE_DIR/$PLATFORM"

# Package based on platform
case "$PLATFORM" in
  linux)
    tar -czf "$RELEASE_DIR/$PLATFORM/undetect-chromium-$VERSION.tar.gz" \
      chrome chrome_sandbox *.pak *.bin locales/ swiftshader/
    echo "✅ Created: $RELEASE_DIR/$PLATFORM/undetect-chromium-$VERSION.tar.gz"
    ;;
  darwin)
    # macOS .app bundle
    cp -r "Chromium.app" "$RELEASE_DIR/$PLATFORM/"
    cd "$RELEASE_DIR/$PLATFORM"
    zip -r "undetect-chromium-$VERSION.zip" "Chromium.app"
    echo "✅ Created: $RELEASE_DIR/$PLATFORM/undetect-chromium-$VERSION.zip"
    ;;
  mingw*|msys*)
    # Windows zip
    7z a "$RELEASE_DIR/windows/undetect-chromium-$VERSION.zip" \
      chrome.exe chrome_*.dll *.pak locales/ swiftshader/
    echo "✅ Created: $RELEASE_DIR/windows/undetect-chromium-$VERSION.zip"
    ;;
esac

echo "✅ Packaging completed!"
```

---

## 📊 Сравнение: JavaScript vs C++ патчинг

| Аспект | JavaScript (текущий) | C++ Fork | Победитель |
|--------|---------------------|----------|-----------|
| **Скорость внедрения** | ✅ 1-2 дня | ❌ 1-2 недели | JavaScript |
| **Простота поддержки** | ✅ Легко | ❌ Сложно | JavaScript |
| **Детектируемость** | ⚠️ Средняя | ✅ Минимальная | **C++** |
| **Proxy detection** | ❌ Детектируется | ✅ Невидимо | **C++** |
| **toString() check** | ❌ Показывает патчи | ✅ Нативный код | **C++** |
| **Property descriptors** | ⚠️ Видно изменения | ✅ Невидимо | **C++** |
| **Производительность** | ⚠️ Overhead | ✅ Нативная | **C++** |
| **Размер дистрибутива** | ✅ Puppeteer (~300MB) | ❌ Custom Chrome (~200MB) | JavaScript |
| **Expertise required** | ✅ JavaScript | ❌ C++/Chromium | JavaScript |
| **Build time** | ✅ Нет | ❌ 2-6 часов | JavaScript |

**Вывод**:
- **JavaScript патчинг** - для быстрого MVP и прототипирования
- **C++ Fork** - для enterprise-grade невидимого браузера

---

## 🚀 Автоматизация сборки

### GitHub Actions (Self-Hosted Runner)

**ВАЖНО**: Сборка Chromium требует мощного сервера. GitHub Actions hosted runners недостаточно (2 cores, 7GB RAM). Нужен **self-hosted runner**.

**.github/workflows/build-chromium.yml:**

```yaml
name: Build Chromium Fork

on:
  push:
    branches: [main, develop]
    paths:
      - 'patches/**'
      - 'build-scripts/**'
  workflow_dispatch:
    inputs:
      build_type:
        description: 'Build type'
        required: true
        default: 'Release'
        type: choice
        options:
          - Release
          - Debug

jobs:
  build-chromium:
    runs-on: self-hosted # ТРЕБУЕТСЯ self-hosted runner!
    timeout-minutes: 360 # 6 hours timeout

    steps:
      - uses: actions/checkout@v4

      - name: Check system resources
        run: |
          echo "CPU cores: $(nproc)"
          echo "RAM: $(free -h | grep Mem | awk '{print $2}')"
          echo "Disk: $(df -h . | tail -1 | awk '{print $4}')"

      - name: Install depot_tools
        run: |
          if [ ! -d "$HOME/depot_tools" ]; then
            git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git $HOME/depot_tools
          fi
          echo "$HOME/depot_tools" >> $GITHUB_PATH

      - name: Fetch Chromium source
        run: |
          mkdir -p chromium
          cd chromium
          if [ ! -d "src" ]; then
            fetch --nohooks --no-history chromium
          fi
          cd src
          gclient sync

      - name: Apply patches
        run: |
          bash build-scripts/apply-patches.sh

      - name: Build Chromium
        run: |
          export BUILD_TYPE=${{ github.event.inputs.build_type || 'Release' }}
          bash build-scripts/build-chromium.sh

      - name: Package Chromium
        run: |
          bash build-scripts/package-chromium.sh

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: undetect-chromium-${{ github.event.inputs.build_type || 'Release' }}
          path: releases/
          retention-days: 30

      - name: Create Release
        if: github.ref == 'refs/heads/main'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ github.run_number }}
          files: releases/**/*
```

### Self-Hosted Runner Setup:

```bash
# На вашем build сервере (16+ cores, 32+ GB RAM, 200GB SSD)

# 1. Создать runner в GitHub repo settings
# Settings > Actions > Runners > New self-hosted runner

# 2. Скачать и настроить runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# 3. Настроить
./config.sh --url https://github.com/wpeva/new-undetect-browser --token YOUR_TOKEN

# 4. Запустить как сервис
sudo ./svc.sh install
sudo ./svc.sh start
```

---

## 📈 Roadmap: JavaScript → C++ Migration

### Phase 1: JavaScript-only (ТЕКУЩЕЕ СОСТОЯНИЕ)
- ✅ Все патчи на JavaScript уровне
- ✅ Быстрая разработка
- ⚠️ Детектируемо через Proxy detection

### Phase 2: Hybrid (РЕКОМЕНДУЕТСЯ)
- 🔄 Критичные патчи на C++ (WebGL, Canvas, Audio)
- 🔄 Некритичные патчи на JavaScript
- ✅ Баланс между скоростью и невидимостью

### Phase 3: Full C++ Fork (ENTERPRISE)
- 🎯 Все патчи на C++ уровне
- 🎯 100% невидимость
- 🎯 Собственный дистрибутив браузера

---

## 🎯 Заключение

**Chromium Fork** - это следующий уровень анти-детект браузера. Вы получаете:

✅ **Полную невидимость** - детекция физически невозможна
✅ **Контроль на уровне движка** - Blink, V8, Skia, WebRTC
✅ **Нативную производительность** - нет JavaScript overhead
✅ **Собственный браузер** - ваш бренд, ваши правила

**Но требуется:**
❌ Expertise в C++/Chromium
❌ Мощный build сервер
❌ Долгая разработка (1-3 месяца)

**Рекомендация**: Начните с JavaScript патчинга (текущая реализация), затем мигрируйте критичные компоненты на C++ по мере необходимости.

---

**Готовы к enterprise-уровню? Давайте начнем!** 🚀
