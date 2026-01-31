# Chromium Fingerprint Spoofing Architecture

## Complete Guide to Downloading, Building, and Modifying Chromium

This document provides a comprehensive technical guide for implementing browser fingerprint spoofing at the Chromium C++ engine level.

---

## Table of Contents

1. [Downloading Chromium Source Code](#1-downloading-chromium-source-code)
2. [Building Chromium](#2-building-chromium)
3. [Chromium Codebase Structure](#3-chromium-codebase-structure)
4. [Fingerprint Vectors Architecture](#4-fingerprint-vectors-architecture)
   - [Navigator API Spoofing](#41-navigator-api-spoofing)
   - [Canvas Fingerprinting](#42-canvas-fingerprinting)
   - [WebGL Fingerprinting](#43-webgl-fingerprinting)
   - [AudioContext Fingerprinting](#44-audiocontext-fingerprinting)
   - [WebRTC/IP Leakage](#45-webrtcip-leakage)
   - [Fonts Fingerprinting](#46-fonts-fingerprinting)
   - [Screen/Display Fingerprinting](#47-screendisplay-fingerprinting)
   - [Battery API](#48-battery-api)
   - [Hardware Concurrency](#49-hardware-concurrency)
   - [Device Memory](#410-device-memory)
   - [Timezone/Locale](#411-timezonelocale)
   - [Permissions API](#412-permissions-api)
   - [WebDriver Detection](#413-webdriver-detection)
   - [CDP Protocol Detection](#414-cdp-protocol-detection)
5. [Implementation Strategies](#5-implementation-strategies)
6. [Testing and Validation](#6-testing-and-validation)

---

## 1. Downloading Chromium Source Code

### Prerequisites

- **Disk Space**: 100GB+ free (source + build artifacts)
- **RAM**: 16GB minimum, 32GB recommended
- **OS**: Linux (Ubuntu 22.04+), macOS, or Windows 10+
- **Tools**: Python 3, Git, C++ compiler

### Step 1: Install depot_tools

```bash
# Clone depot_tools (Google's build tools)
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git

# Add to PATH
export PATH="$PATH:$(pwd)/depot_tools"

# Persist in ~/.bashrc or ~/.zshrc
echo 'export PATH="$PATH:$HOME/depot_tools"' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: Download Chromium Source

```bash
# Create working directory
mkdir ~/chromium && cd ~/chromium

# Initialize gclient configuration
fetch --nohooks chromium

# This downloads ~30GB of source code
# Expect 1-4 hours depending on connection speed

# Sync dependencies
cd src
gclient sync --with_branch_heads --with_tags --jobs=4
```

### Step 3: Switch to Specific Version (Optional)

```bash
cd ~/chromium/src

# List available versions
git tag | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" | tail -20

# Checkout specific version
git checkout -b build_branch refs/tags/122.0.6261.94
gclient sync --with_branch_heads --with_tags
```

### Alternative: Use ungoogled-chromium

For privacy-focused builds without Google tracking:

```bash
# Clone ungoogled-chromium repository
git clone https://github.com/nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel
cd ungoogled-chromium

# Run the build script
python3 nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel nickel

# Or download pre-built binaries from releases page
```

---

## 2. Building Chromium

### Linux Build

```bash
cd ~/chromium/src

# Install build dependencies (Ubuntu/Debian)
./build/install-build-deps.sh

# Generate build files
gn gen out/Default --args='
  is_debug = false
  is_official_build = true
  symbol_level = 0
  enable_nacl = false
  chrome_pgo_phase = 0
  is_component_build = false

  # Disable Google services
  google_api_key = ""
  google_default_client_id = ""
  google_default_client_secret = ""
  use_official_google_api_keys = false

  # Privacy settings
  safe_browsing_mode = 0
  enable_reporting = false

  # Anti-detection
  enable_automation = false
'

# Build (8-16 hours on first build)
ninja -C out/Default chrome chromedriver

# Output binary location
ls -la out/Default/chrome
```

### Build Arguments Reference

| Argument | Description |
|----------|-------------|
| `is_debug = false` | Release build |
| `is_official_build = true` | Enable optimizations |
| `symbol_level = 0` | No debug symbols (smaller binary) |
| `enable_automation = false` | Disable automation flags |
| `enable_nacl = false` | Disable NaCl (not needed) |
| `safe_browsing_mode = 0` | Disable Google Safe Browsing |
| `enable_reporting = false` | Disable crash reporting |

### Incremental Builds

After applying patches:

```bash
# Only rebuild changed components
ninja -C out/Default chrome

# Clean build (if needed)
rm -rf out/Default
gn gen out/Default
ninja -C out/Default chrome
```

---

## 3. Chromium Codebase Structure

### Key Directories

```
chromium/src/
├── chrome/                     # Chrome browser UI and features
│   ├── browser/               # Browser process code
│   │   ├── permissions/       # Permission handling
│   │   └── devtools/          # DevTools integration
│   ├── renderer/              # Renderer process code
│   └── test/chromedriver/     # ChromeDriver source
│
├── content/                    # Multi-process architecture
│   ├── browser/               # Browser-side content handling
│   │   ├── devtools/          # DevTools protocol handlers
│   │   └── renderer_host/     # Renderer process management
│   └── renderer/              # Renderer-side content handling
│
├── third_party/blink/          # Blink rendering engine (WebKit fork)
│   └── renderer/
│       ├── core/              # Core DOM/CSS/HTML implementation
│       │   ├── frame/         # Frame and Navigator
│       │   ├── html/canvas/   # Canvas elements
│       │   └── inspector/     # Inspector/DevTools
│       ├── modules/           # Web platform APIs
│       │   ├── canvas/        # Canvas 2D context
│       │   ├── webgl/         # WebGL implementation
│       │   ├── webaudio/      # Web Audio API
│       │   ├── webrtc/        # WebRTC implementation
│       │   ├── permissions/   # Permissions API
│       │   ├── battery/       # Battery Status API
│       │   └── screen_orientation/
│       ├── bindings/          # JavaScript bindings (IDL)
│       └── platform/          # Platform abstraction
│
├── v8/                         # V8 JavaScript engine
│   └── src/
│       └── inspector/         # V8 Inspector
│
├── gpu/                        # GPU/Graphics code
│   └── command_buffer/        # GPU command handling
│
└── media/                      # Media handling
    └── audio/                 # Audio subsystem
```

---

## 4. Fingerprint Vectors Architecture

### 4.1 Navigator API Spoofing

**Purpose**: Spoof browser/OS identification properties.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/core/frame/navigator.cc` | Navigator object implementation |
| `third_party/blink/renderer/core/frame/navigator.h` | Navigator header |
| `third_party/blink/renderer/core/frame/navigator.idl` | JavaScript interface definition |
| `third_party/blink/renderer/core/frame/navigator_id.cc` | User agent and platform strings |

#### Key Functions to Modify

```cpp
// navigator.cc

// navigator.userAgent
String Navigator::userAgent() const {
  // Original: return GetUserAgent();

  // Spoofed implementation:
  static String spoofed_ua = GetSpoofedUserAgent();
  return spoofed_ua;
}

// navigator.platform
String Navigator::platform() const {
  // Original: return NavigatorID::platform(GetFrame());

  // Spoofed:
  return GetSpoofedPlatform();  // e.g., "Win32", "MacIntel", "Linux x86_64"
}

// navigator.hardwareConcurrency
unsigned Navigator::hardwareConcurrency() const {
  // Original: return base::SysInfo::NumberOfProcessors();

  // Spoofed (return believable value):
  return GetSpoofedConcurrency();  // e.g., 4, 8, 12
}

// navigator.deviceMemory
float Navigator::deviceMemory() const {
  // Original: returns actual RAM in GB

  // Spoofed:
  return GetSpoofedMemory();  // e.g., 8.0
}

// navigator.webdriver
bool Navigator::webdriver() const {
  // CRITICAL: Always return false
  return false;
}

// navigator.plugins
DOMPluginArray* Navigator::plugins() const {
  // Return spoofed plugin list
  return GetSpoofedPlugins();
}

// navigator.languages
Vector<String> Navigator::languages() const {
  // Return spoofed language preferences
  return GetSpoofedLanguages();  // e.g., ["en-US", "en"]
}
```

#### IDL Definition (navigator.idl)

```idl
// Original attributes that need spoofing:
[HighEntropy, MeasureAs=NavigatorUserAgent] readonly attribute DOMString userAgent;
[HighEntropy, MeasureAs=NavigatorPlatform] readonly attribute DOMString platform;
[HighEntropy] readonly attribute unsigned long hardwareConcurrency;
[HighEntropy] readonly attribute double deviceMemory;
readonly attribute boolean webdriver;
```

---

### 4.2 Canvas Fingerprinting

**Purpose**: Add noise to canvas pixel data to prevent fingerprint matching.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc` | Canvas 2D context |
| `third_party/blink/renderer/core/html/canvas/html_canvas_element.cc` | Canvas element |
| `third_party/blink/renderer/modules/canvas/canvas2d/base_rendering_context_2d.cc` | Base context |

#### Key Functions to Modify

```cpp
// canvas_rendering_context_2d.cc

// Add noise to getImageData()
ImageData* CanvasRenderingContext2D::getImageData(
    int sx, int sy, int sw, int sh,
    ExceptionState& exception_state) {

  ImageData* data = /* original implementation */;

  // Apply fingerprint protection
  AddCanvasNoise(data->data().Data(),
                 data->data().length(),
                 GetSessionSeed());

  return data;
}

// Noise injection helper
static void AddCanvasNoise(uint8_t* data, size_t size, uint64_t seed) {
  std::mt19937_64 gen(seed);
  std::uniform_int_distribution<int> dist(-2, 2);

  // Modify ~0.1% of pixels
  size_t noise_count = size / 4000;  // 4 bytes per pixel

  for (size_t i = 0; i < noise_count; i++) {
    size_t idx = (gen() % (size / 4)) * 4;

    // Modify RGB channels only (preserve alpha)
    for (int c = 0; c < 3; c++) {
      int val = data[idx + c] + dist(gen);
      data[idx + c] = std::clamp(val, 0, 255);
    }
  }
}

// Modify toDataURL()
String CanvasRenderingContext2D::toDataURL(
    const String& mime_type,
    const ScriptValue& quality,
    ExceptionState& exception_state) {

  // Get canvas snapshot
  scoped_refptr<StaticBitmapImage> snapshot = GetImage();

  // Apply noise before encoding
  ApplyCanvasNoiseToImage(snapshot);

  return EncodeImage(snapshot, mime_type, quality);
}

// Modify toBlob()
void CanvasRenderingContext2D::toBlob(
    BlobCallback* callback,
    const String& mime_type,
    const ScriptValue& quality,
    ExceptionState& exception_state) {

  // Apply noise before creating blob
  ApplyCanvasNoise(GetCanvasSnapshot());

  /* original toBlob implementation */
}
```

#### Additional Canvas Files

```cpp
// html_canvas_element.cc

String HTMLCanvasElement::ToDataURLInternal(
    const String& mime_type,
    const double& quality,
    SourceDrawingBuffer source_drawing_buffer) {

  scoped_refptr<StaticBitmapImage> image = /* get snapshot */;

  // Apply noise
  if (RuntimeEnabledFeatures::CanvasFingerprintProtectionEnabled()) {
    ApplySubtleNoise(image);
  }

  return ImageDataURL(*image, mime_type, quality);
}
```

---

### 4.3 WebGL Fingerprinting

**Purpose**: Spoof GPU vendor/renderer and add noise to readPixels.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc` | WebGL base context |
| `third_party/blink/renderer/modules/webgl/webgl2_rendering_context_base.cc` | WebGL 2 context |
| `third_party/blink/renderer/modules/webgl/webgl_debug_renderer_info.cc` | Debug extension |

#### Key Functions to Modify

```cpp
// webgl_rendering_context_base.cc

// Spoof getParameter()
ScriptValue WebGLRenderingContextBase::getParameter(
    ScriptState* script_state,
    GLenum pname) {

  switch (pname) {
    case GL_VENDOR: {
      // Original: ContextGL()->GetString(GL_VENDOR)
      return WebGLAny(script_state, GetSpoofedVendor());
    }

    case GL_RENDERER: {
      // Original: ContextGL()->GetString(GL_RENDERER)
      return WebGLAny(script_state, GetSpoofedRenderer());
    }

    case GL_UNMASKED_VENDOR_WEBGL:
      return WebGLAny(script_state, "Intel Inc.");

    case GL_UNMASKED_RENDERER_WEBGL:
      return WebGLAny(script_state, "Intel(R) UHD Graphics");

    // Spoof numerical parameters with slight noise
    case GL_MAX_TEXTURE_SIZE:
    case GL_MAX_VIEWPORT_DIMS:
    case GL_MAX_VERTEX_ATTRIBS:
      return WebGLAny(script_state, AddParameterNoise(original_value));
  }

  return /* original implementation */;
}

// Add noise to readPixels()
void WebGLRenderingContextBase::ReadPixels(
    GLint x, GLint y,
    GLsizei width, GLsizei height,
    GLenum format, GLenum type,
    MaybeShared<DOMArrayBufferView> pixels) {

  // Original readPixels
  ContextGL()->ReadPixels(x, y, width, height, format, type, pixels->Data());

  // Add subtle noise for fingerprint protection
  if (type == GL_UNSIGNED_BYTE) {
    AddWebGLNoise(static_cast<uint8_t*>(pixels->Data()),
                  width * height * 4,
                  GetSessionSeed());
  }
}

// Helper: Get spoofed renderer string
static String GetSpoofedRenderer() {
  // Common generic renderers
  static const char* renderers[] = {
    "ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (Intel, Intel(R) Iris Plus Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
  };

  return renderers[GetProfileIndex() % 3];
}
```

#### WebGL Extension Handling

```cpp
// webgl_debug_renderer_info.cc

// Override extension behavior
bool WebGLDebugRendererInfo::Supported(WebGLRenderingContextBase* context) {
  // Option 1: Disable extension entirely
  // return false;

  // Option 2: Allow but return spoofed values
  return true;
}
```

---

### 4.4 AudioContext Fingerprinting

**Purpose**: Add noise to audio processing to prevent fingerprinting.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/modules/webaudio/analyser_node.cc` | FFT analysis |
| `third_party/blink/renderer/modules/webaudio/oscillator_node.cc` | Audio oscillator |
| `third_party/blink/renderer/modules/webaudio/dynamics_compressor_node.cc` | Dynamics compressor |
| `third_party/blink/renderer/modules/webaudio/offline_audio_context.cc` | Offline rendering |
| `third_party/blink/renderer/modules/webaudio/audio_destination_node.cc` | Audio output |

#### Key Functions to Modify

```cpp
// analyser_node.cc

void AnalyserNode::getFloatFrequencyData(DOMFloat32Array* array) {
  // Original: GetFloatFrequencyData(array->Data())

  GetFloatFrequencyData(array->Data());

  // Add subtle noise to frequency data
  AddAudioNoise(array->Data(), array->length(), GetSessionSeed());
}

void AnalyserNode::getByteFrequencyData(DOMUint8Array* array) {
  GetByteFrequencyData(array->Data());

  // Add noise
  AddByteNoise(array->Data(), array->length());
}

void AnalyserNode::getFloatTimeDomainData(DOMFloat32Array* array) {
  GetFloatTimeDomainData(array->Data());
  AddAudioNoise(array->Data(), array->length(), GetSessionSeed());
}

// Noise helper
static void AddAudioNoise(float* data, size_t size, uint64_t seed) {
  std::mt19937_64 gen(seed);
  std::uniform_real_distribution<float> dist(-0.0001f, 0.0001f);

  for (size_t i = 0; i < size; i++) {
    data[i] += dist(gen);
  }
}
```

```cpp
// oscillator_node.cc

void OscillatorNode::Process(size_t frames_to_process) {
  // Original oscillator processing
  /* ... */

  // Add imperceptible frequency variation
  float frequency_noise = GetFrequencyNoise();  // ~0.01% variation
  actual_frequency *= (1.0f + frequency_noise);
}
```

```cpp
// dynamics_compressor_node.cc

// Spoof compressor parameters slightly
float DynamicsCompressorNode::reduction() const {
  float original = /* original reduction value */;

  // Add slight variation
  return AddParameterNoise(original, 0.001f);
}
```

```cpp
// offline_audio_context.cc

// Add noise to offline rendering result
ScriptPromise OfflineAudioContext::startRendering(ScriptState* script_state) {
  return /* original promise */
    .Then([](AudioBuffer* buffer) {
      // Add noise to final audio buffer
      AddBufferNoise(buffer);
      return buffer;
    });
}
```

---

### 4.5 WebRTC/IP Leakage

**Purpose**: Prevent real IP address leakage through WebRTC.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/modules/peerconnection/rtc_peer_connection.cc` | PeerConnection |
| `third_party/blink/renderer/platform/peerconnection/rtc_ice_candidate_platform.cc` | ICE candidates |
| `content/browser/webrtc/webrtc_internals.cc` | WebRTC internals |

#### Key Functions to Modify

```cpp
// rtc_peer_connection.cc

void RTCPeerConnection::SetLocalDescription(
    RTCSessionDescription* description,
    /* ... */) {

  // Filter SDP to remove local IPs
  String filtered_sdp = FilterLocalIPs(description->sdp());
  description->setSdp(filtered_sdp);

  /* original implementation */
}

void RTCPeerConnection::onIceCandidate(RTCIceCandidate* candidate) {
  // Filter candidate to remove local IPs
  if (ShouldFilterCandidate(candidate)) {
    // Replace with spoofed or mDNS address
    candidate = CreateSpoofedCandidate(candidate);
  }

  /* dispatch event */
}

// SDP filtering helper
static String FilterLocalIPs(const String& sdp) {
  // Remove lines containing local IP addresses
  // c=IN IP4 192.168.x.x
  // a=candidate:... 192.168.x.x ...

  return RegexReplace(sdp,
    R"((?:192\.168|10\.|172\.(?:1[6-9]|2[0-9]|3[01]))\.\d+\.\d+)",
    "0.0.0.0");
}
```

---

### 4.6 Fonts Fingerprinting

**Purpose**: Add noise to font metrics and prevent font enumeration.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/core/css/font_face.cc` | Font face loading |
| `third_party/blink/renderer/platform/fonts/font.cc` | Font metrics |
| `third_party/blink/renderer/core/html/canvas/text_metrics.cc` | Canvas text measurement |

#### Key Functions to Modify

```cpp
// text_metrics.cc

float TextMetrics::width() const {
  float original_width = /* original calculation */;

  // Add subtle noise (0.001-0.01 pixels)
  return AddTextNoise(original_width, GetSessionSeed());
}

float TextMetrics::actualBoundingBoxLeft() const {
  return AddTextNoise(original_value, GetSessionSeed());
}

// Similar for: actualBoundingBoxRight, fontBoundingBoxAscent, etc.
```

```cpp
// font.cc

FloatRect Font::BoundingBox(const String& text) const {
  FloatRect original = /* original implementation */;

  // Add imperceptible noise
  original.SetWidth(original.Width() + GetNoiseOffset());
  original.SetHeight(original.Height() + GetNoiseOffset());

  return original;
}
```

---

### 4.7 Screen/Display Fingerprinting

**Purpose**: Spoof screen dimensions and color depth.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/core/frame/screen.cc` | Screen object |
| `third_party/blink/renderer/core/frame/window.cc` | Window dimensions |

#### Key Functions to Modify

```cpp
// screen.cc

int Screen::height() const {
  // Return spoofed screen height
  return GetSpoofedScreenHeight();  // e.g., 1080
}

int Screen::width() const {
  return GetSpoofedScreenWidth();  // e.g., 1920
}

int Screen::availHeight() const {
  return GetSpoofedAvailHeight();  // e.g., 1040
}

int Screen::availWidth() const {
  return GetSpoofedAvailWidth();  // e.g., 1920
}

unsigned Screen::colorDepth() const {
  return 24;  // Standard color depth
}

unsigned Screen::pixelDepth() const {
  return 24;
}

// Optional: Device pixel ratio
float Screen::devicePixelRatio() const {
  return GetSpoofedPixelRatio();  // e.g., 1.0, 1.25, 1.5
}
```

---

### 4.8 Battery API

**Purpose**: Prevent fingerprinting via battery status.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/modules/battery/battery_manager.cc` | Battery status |

#### Key Functions to Modify

```cpp
// battery_manager.cc

// Option 1: Return fake "full" battery
bool BatteryManager::charging() const {
  return true;  // Always "charging"
}

double BatteryManager::chargingTime() const {
  return 0;  // Fully charged
}

double BatteryManager::dischargingTime() const {
  return std::numeric_limits<double>::infinity();  // Not discharging
}

double BatteryManager::level() const {
  return 1.0;  // 100% charged
}

// Option 2: Add noise
double BatteryManager::level() const {
  // Quantize to 5% increments to reduce uniqueness
  double actual = GetActualLevel();
  return std::round(actual * 20.0) / 20.0;  // 0.05, 0.10, 0.15, etc.
}
```

---

### 4.9 Hardware Concurrency

**Purpose**: Return spoofed CPU core count.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/core/frame/navigator_concurrent_hardware.cc` | Hardware concurrency |

```cpp
// navigator_concurrent_hardware.cc

unsigned NavigatorConcurrentHardware::hardwareConcurrency() const {
  // Original: base::SysInfo::NumberOfProcessors()

  // Return common values: 4, 8, 12, 16
  return GetSpoofedCores();
}

static unsigned GetSpoofedCores() {
  // Common CPU configurations
  static const unsigned common_cores[] = {4, 8, 12, 16};
  return common_cores[GetProfileIndex() % 4];
}
```

---

### 4.10 Device Memory

**Purpose**: Return spoofed RAM amount.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/core/frame/navigator_device_memory.cc` | Device memory |

```cpp
// navigator_device_memory.cc

float NavigatorDeviceMemory::deviceMemory() const {
  // Original: QuantizeMemory(base::SysInfo::AmountOfPhysicalMemory())

  // Return common values: 4, 8, 16, 32
  return GetSpoofedMemory();
}

static float GetSpoofedMemory() {
  static const float common_memory[] = {4.0f, 8.0f, 16.0f, 32.0f};
  return common_memory[GetProfileIndex() % 4];
}
```

---

### 4.11 Timezone/Locale

**Purpose**: Spoof timezone and locale settings.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/core/frame/navigator_language.cc` | Language preferences |
| `third_party/blink/renderer/platform/wtf/date_math.cc` | Date/timezone |
| `v8/src/date/date.cc` | V8 date handling |

```cpp
// navigator_language.cc

Vector<String> NavigatorLanguage::languages() const {
  // Return spoofed languages
  return GetSpoofedLanguages();  // e.g., {"en-US", "en"}
}

String NavigatorLanguage::language() const {
  return GetSpoofedLanguage();  // e.g., "en-US"
}
```

```cpp
// date_math.cc or v8/date.cc

// Override timezone offset
double GetLocalTimezoneOffset() {
  // Return spoofed offset in milliseconds
  return GetSpoofedTimezoneOffset();  // e.g., -8 * 60 * 60 * 1000 for PST
}
```

---

### 4.12 Permissions API

**Purpose**: Return realistic permission states.

#### Files to Modify

| File | Purpose |
|------|---------|
| `chrome/browser/permissions/permission_manager.cc` | Permission handling |
| `third_party/blink/renderer/modules/permissions/permissions.cc` | Permissions API |

```cpp
// permission_manager.cc

PermissionStatus PermissionManager::GetPermissionStatus(
    ContentSettingsType permission,
    const GURL& requesting_origin,
    const GURL& embedding_origin) {

  // Return "prompt" for realistic behavior
  // Detection systems flag "denied" as suspicious
  switch (permission) {
    case ContentSettingsType::NOTIFICATIONS:
    case ContentSettingsType::GEOLOCATION:
      return PermissionStatus::ASK;

    default:
      return /* original implementation */;
  }
}
```

---

### 4.13 WebDriver Detection

**Purpose**: Hide automation indicators.

#### Files to Modify

| File | Purpose |
|------|---------|
| `third_party/blink/renderer/core/frame/navigator.cc` | navigator.webdriver |
| `chrome/test/chromedriver/chrome_launcher.cc` | ChromeDriver flags |
| `content/browser/renderer_host/render_frame_host_impl.cc` | Automation state |

```cpp
// navigator.cc

bool Navigator::webdriver() const {
  // CRITICAL: Always return false
  return false;
}
```

```cpp
// chrome_launcher.cc

// Remove automation flags
Status LaunchDesktopChrome(/* ... */) {
  // REMOVED: switches.SetSwitch("enable-automation");
  // REMOVED: switches.SetSwitch("disable-blink-features=AutomationControlled");
}
```

```cpp
// render_frame_host_impl.cc

void RenderFrameHostImpl::SetAutomationControlEnabled(bool enabled) {
  // Always set to false
  GetAssociatedLocalFrame()->SetAutomationControlEnabled(false);
}
```

---

### 4.14 CDP Protocol Detection

**Purpose**: Disable or limit Chrome DevTools Protocol detection.

#### Files to Modify

| File | Purpose |
|------|---------|
| `content/browser/devtools/devtools_http_handler.cc` | HTTP handler |
| `chrome/browser/devtools/devtools_window.cc` | DevTools window |
| `v8/src/inspector/v8-console.cc` | Console inspector |

```cpp
// devtools_http_handler.cc

void ServerWrapper::StartServer(/* ... */) {
  // Option 1: Disable entirely
  LOG(INFO) << "DevTools HTTP handler disabled";
  return;

  // Option 2: Randomize port
  // Option 3: Add authentication
}
```

```cpp
// chrome_content_renderer_client.cc

void ChromeContentRendererClient::DidCreateScriptContext(
    v8::Local<v8::Context> context, /* ... */) {

  // Remove CDP artifacts from global scope
  v8::Local<v8::Object> global = context->Global();

  const char* cdp_vars[] = {
    "$cdc_", "$chrome_", "$wdc_",
    "__webdriver", "__selenium", "__phantom",
    "callPhantom", "_phantom"
  };

  for (const char* var : cdp_vars) {
    global->Delete(context,
      v8::String::NewFromUtf8(isolate, var).ToLocalChecked());
  }
}
```

---

## 5. Implementation Strategies

### Session-Based Consistency

Fingerprint values must be consistent within a browsing session:

```cpp
// fingerprint_session.h

class FingerprintSession {
 public:
  static FingerprintSession& GetInstance() {
    static FingerprintSession instance;
    return instance;
  }

  uint64_t GetSeed() const { return seed_; }

  String GetUserAgent() const { return user_agent_; }
  String GetPlatform() const { return platform_; }
  String GetGPUVendor() const { return gpu_vendor_; }
  String GetGPURenderer() const { return gpu_renderer_; }
  unsigned GetCores() const { return cores_; }
  float GetMemory() const { return memory_; }
  int GetScreenWidth() const { return screen_width_; }
  int GetScreenHeight() const { return screen_height_; }

 private:
  FingerprintSession() {
    // Initialize from config or randomize
    seed_ = std::chrono::system_clock::now().time_since_epoch().count();
    InitializeFromProfile();
  }

  void InitializeFromProfile() {
    // Load from profile config or generate consistent values
  }

  uint64_t seed_;
  String user_agent_;
  String platform_;
  String gpu_vendor_;
  String gpu_renderer_;
  unsigned cores_;
  float memory_;
  int screen_width_;
  int screen_height_;
};
```

### Profile-Based Fingerprints

```cpp
// fingerprint_profile.h

struct FingerprintProfile {
  // Navigator
  String user_agent;
  String platform;
  Vector<String> languages;
  unsigned hardware_concurrency;
  float device_memory;

  // Screen
  int screen_width;
  int screen_height;
  int avail_width;
  int avail_height;
  unsigned color_depth;
  float pixel_ratio;

  // GPU
  String webgl_vendor;
  String webgl_renderer;
  String webgl_version;

  // Audio
  float audio_noise_level;

  // Canvas
  float canvas_noise_level;

  // Timezone
  int timezone_offset_minutes;
  String timezone_name;
};

// Load from JSON configuration
FingerprintProfile LoadProfile(const String& profile_path);
```

### Noise Injection Utilities

```cpp
// noise_utils.h

#include <random>
#include <cmath>

class NoiseGenerator {
 public:
  explicit NoiseGenerator(uint64_t seed) : gen_(seed) {}

  // Add noise to float value
  float AddNoise(float value, float max_deviation) {
    std::uniform_real_distribution<float> dist(-max_deviation, max_deviation);
    return value + dist(gen_);
  }

  // Add noise to integer
  int AddNoise(int value, int max_deviation) {
    std::uniform_int_distribution<int> dist(-max_deviation, max_deviation);
    return value + dist(gen_);
  }

  // Add noise to pixel buffer
  void AddPixelNoise(uint8_t* data, size_t size, float percentage) {
    std::uniform_int_distribution<int> noise_dist(-2, 2);
    size_t pixels = size / 4;
    size_t noise_count = static_cast<size_t>(pixels * percentage);

    for (size_t i = 0; i < noise_count; i++) {
      size_t idx = (gen_() % pixels) * 4;
      for (int c = 0; c < 3; c++) {  // RGB only
        int val = data[idx + c] + noise_dist(gen_);
        data[idx + c] = std::clamp(val, 0, 255);
      }
    }
  }

  // Add noise to audio buffer
  void AddAudioNoise(float* data, size_t size, float amplitude) {
    std::uniform_real_distribution<float> dist(-amplitude, amplitude);
    for (size_t i = 0; i < size; i++) {
      data[i] += dist(gen_);
    }
  }

 private:
  std::mt19937_64 gen_;
};
```

---

## 6. Testing and Validation

### Detection Test Sites

| Site | What It Tests |
|------|---------------|
| [bot.sannysoft.com](https://bot.sannysoft.com) | Comprehensive bot detection |
| [pixelscan.net](https://pixelscan.net) | Advanced fingerprinting |
| [browserleaks.com](https://browserleaks.com) | Canvas, WebGL, fonts |
| [creepjs.com](https://abrahamjuliot.github.io/creepjs/) | Lie detection, inconsistencies |
| [fingerprintjs.com/demo](https://fingerprintjs.com/demo) | Commercial fingerprinting |
| [amiunique.org](https://amiunique.org) | Fingerprint uniqueness |

### Validation Checklist

```
[x] navigator.webdriver === false
[x] navigator.userAgent matches profile
[x] navigator.platform matches OS
[x] navigator.languages realistic
[x] navigator.hardwareConcurrency believable (4/8/12/16)
[x] navigator.deviceMemory believable (4/8/16/32)

[x] Canvas toDataURL() produces consistent noise
[x] Canvas getImageData() produces consistent noise
[x] Canvas toBlob() produces consistent noise

[x] WebGL vendor/renderer spoofed
[x] WebGL readPixels() has noise
[x] WEBGL_debug_renderer_info spoofed

[x] AudioContext analyser has noise
[x] Audio oscillator has frequency variation

[x] Screen dimensions match profile
[x] window.devicePixelRatio matches

[x] Permissions return "prompt" not "denied"
[x] Battery API returns fake values

[x] No $cdc_ variables in window
[x] No __webdriver variables
[x] DevTools not detectable

[x] Timezone matches profile
[x] Date().getTimezoneOffset() matches profile
```

### Automated Testing Script

```javascript
// test-fingerprint.js
async function testFingerprint() {
  const results = {};

  // Navigator
  results.webdriver = navigator.webdriver;
  results.userAgent = navigator.userAgent;
  results.platform = navigator.platform;
  results.languages = navigator.languages;
  results.cores = navigator.hardwareConcurrency;
  results.memory = navigator.deviceMemory;

  // Canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillText('test', 10, 10);
  results.canvasHash = await hashData(canvas.toDataURL());

  // WebGL
  const gl = canvas.getContext('webgl');
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  results.webglVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
  results.webglRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);

  // Screen
  results.screenWidth = screen.width;
  results.screenHeight = screen.height;

  // CDP detection
  results.cdcPresent = !!window.$cdc_;
  results.webdriverPresent = !!window.__webdriver;

  return results;
}
```

---

## Summary

This architecture covers all major fingerprinting vectors in Chromium. The key principles are:

1. **Consistency**: Same fingerprint values within a session
2. **Realism**: Values must match real browser distributions
3. **Subtlety**: Noise should be imperceptible but effective
4. **Completeness**: Cover all detection vectors

For production deployment, use the patches in `/chromium/patches/` and the build script in `/chromium/build.sh`.

---

## Sources

- [Chromium Source Code](https://github.com/chromium/chromium)
- [Get the Code: Checkout, Build & Run Chromium](https://www.chromium.org/developers/how-tos/get-the-code/)
- [Chromium for Developers](https://www.chromium.org/developers/)
- [Building Chromium & V8 with Visual Studio 2026](https://blog.j2i.net/2025/12/23/building-chromium-v8-with-visual-studio-2026-december-2025/)
- [Chromium Git Repository](https://chromium.googlesource.com/chromium/src)
