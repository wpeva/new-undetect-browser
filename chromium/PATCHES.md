# Chromium Anti-Detection Patches

This document describes all patches applied to Chromium for anti-detection purposes.

## Patch Naming Convention

```
XXX-category-description.patch
```

- `XXX`: Sequential number (001, 002, etc.)
- `category`: Functional category (webdriver, navigator, canvas, etc.)
- `description`: Brief description of what the patch does

## Patch Application Order

Patches must be applied in numerical order to avoid conflicts.

## Category 1: WebDriver Detection Removal

### 001-remove-webdriver.patch

**Purpose:** Remove `navigator.webdriver` property

**Files Modified:**
- `third_party/blink/renderer/core/frame/navigator.idl`
- `third_party/blink/renderer/core/frame/navigator.cc`
- `third_party/blink/renderer/core/frame/navigator.h`

**Changes:**
```cpp
// BEFORE:
// In navigator.idl:
[Measure] readonly attribute boolean webdriver;

// In navigator.cc:
bool Navigator::webdriver() const {
  return GetFrame() && GetFrame()->GetDocument()->IsWebDriver();
}

// AFTER:
// Remove webdriver attribute entirely
// navigator.webdriver becomes undefined
```

**Impact:**
- `navigator.webdriver` returns `undefined` instead of `true`
- Critical for passing bot detection
- **Detection sites bypassed:** bot.sannysoft.com, pixelscan.net

**Test:**
```javascript
console.log(typeof navigator.webdriver); // "undefined"
```

---

### 002-remove-automation-flags.patch

**Purpose:** Remove `--enable-automation` flag and related detection

**Files Modified:**
- `chrome/browser/chrome_content_browser_client.cc`
- `content/public/common/content_switches.cc`
- `content/public/common/content_switches.h`

**Changes:**
```cpp
// BEFORE:
// In content_switches.cc:
const char kEnableAutomation[] = "enable-automation";

// In chrome_content_browser_client.cc:
if (command_line.HasSwitch(switches::kEnableAutomation)) {
  // Set automation mode
}

// AFTER:
// Remove switch entirely
// Remove all automation mode checks
```

**Impact:**
- Browser doesn't expose automation mode
- InfoBar "Chrome is being controlled by automated test software" never appears
- **Detection sites bypassed:** creepjs.com, areyouheadless

---

### 003-remove-devtools-detection.patch

**Purpose:** Hide Chrome DevTools Protocol detection vectors

**Files Modified:**
- `third_party/blink/renderer/core/inspector/dev_tools_host.cc`
- `chrome/browser/devtools/devtools_window.cc`

**Changes:**
```cpp
// BEFORE:
// In dev_tools_host.cc:
bool DevToolsHost::IsDevToolsOpened() {
  return true;  // Exposed to page
}

// AFTER:
bool DevToolsHost::IsDevToolsOpened() {
  return false;  // Always return false
}

// Also hide CDP in chrome.debugger API
```

**Impact:**
- Pages can't detect CDP/DevTools connection
- `window.outerWidth - window.innerWidth` looks normal
- **Detection sites bypassed:** brotector, creepjs

---

## Category 2: Navigator API Spoofing

### 010-navigator-plugins.patch

**Purpose:** Provide realistic plugin enumeration

**Files Modified:**
- `third_party/blink/renderer/core/frame/navigator_plugins.cc`
- `third_party/blink/renderer/modules/plugins/dom_plugin_array.cc`

**Changes:**
```cpp
// BEFORE:
// In navigator_plugins.cc:
DOMPluginArray* NavigatorPlugins::plugins() {
  // Returns empty array in headless
  if (IsHeadless()) return empty_array;
}

// AFTER:
DOMPluginArray* NavigatorPlugins::plugins() {
  // Always return realistic plugin list based on platform
  return GetRealisticPlugins(platform);
}

// Add realistic plugins:
// - PDF Viewer (Chrome built-in)
// - Chrome PDF Viewer
// - Native Client (if enabled)
```

**Impact:**
- `navigator.plugins.length` is realistic (3-5 plugins)
- Plugin names match real Chrome installation
- **Detection sites bypassed:** pixelscan, creepjs

**Test:**
```javascript
console.log(navigator.plugins.length); // 3 (not 0)
console.log(navigator.plugins[0].name); // "PDF Viewer"
```

---

### 011-navigator-languages.patch

**Purpose:** Realistic language list with variation

**Files Modified:**
- `third_party/blink/renderer/core/frame/navigator_language.cc`

**Changes:**
```cpp
// BEFORE:
Vector<String> NavigatorLanguage::languages() {
  // Returns single language
  return { "en-US" };
}

// AFTER:
Vector<String> NavigatorLanguage::languages() {
  // Return realistic multi-language list
  // Based on OS locale + common secondary languages
  return GetRealisticLanguages();
}

// Example outputs:
// US: ["en-US", "en"]
// UK: ["en-GB", "en-US", "en"]
// Multi-lingual: ["en-US", "es", "en"]
```

**Impact:**
- Language list matches real user behavior
- Consistency with Accept-Language header
- **Detection sites bypassed:** creepjs, abrahamjuliot

**Test:**
```javascript
console.log(navigator.languages); // ["en-US", "en"]
```

---

### 012-navigator-platform.patch

**Purpose:** Platform string customization

**Files Modified:**
- `third_party/blink/renderer/core/frame/navigator_id.cc`

**Changes:**
```cpp
// BEFORE:
String NavigatorID::platform() const {
  // Returns fixed platform
  return "Linux x86_64";  // Always Linux in headless
}

// AFTER:
String NavigatorID::platform() const {
  // Return configurable platform
  return GetConfiguredPlatform();  // "Win32", "MacIntel", etc.
}
```

**Impact:**
- Platform can be spoofed via command-line flag
- Consistent with User-Agent header
- **Flag:** `--navigator-platform="Win32"`

**Test:**
```javascript
console.log(navigator.platform); // "Win32"
```

---

## Category 3: Canvas & WebGL Fingerprinting

### 020-canvas-noise.patch

**Purpose:** Add per-domain consistent noise to canvas fingerprints

**Files Modified:**
- `third_party/blink/renderer/platform/graphics/canvas_2d_layer_bridge.cc`
- `third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc`

**Changes:**
```cpp
// BEFORE:
void CanvasRenderingContext2D::DrawImage(...) {
  // Direct drawing, no noise
  canvas_->DrawImage(image, ...);
}

// AFTER:
void CanvasRenderingContext2D::DrawImage(...) {
  // Add per-domain seeded noise
  if (ShouldAddCanvasNoise()) {
    uint32_t seed = GetDomainSeed(GetDocument()->Url());
    AddImageNoise(image, seed, noise_level_);
  }
  canvas_->DrawImage(image, ...);
}

// Noise algorithm:
// - PRNG seeded with domain hash
// - Modify 1-3% of pixels by ±1-2 RGB values
// - Consistent across same domain
// - Invisible to human eye
```

**Impact:**
- Unique canvas fingerprint per domain
- Consistent on same site (no detection from inconsistency)
- **Fingerprint uniqueness:** 1 in 10^6
- **Detection sites bypassed:** pixelscan, browserleaks

**Configuration:**
- `--canvas-noise=subtle` (0.5% pixels, ±1 value)
- `--canvas-noise=moderate` (1.5% pixels, ±2 value) - default
- `--canvas-noise=aggressive` (3% pixels, ±4 value)

**Test:**
```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.fillText('Test', 10, 10);
const fp1 = canvas.toDataURL();
// fp1 is unique but consistent on each domain
```

---

### 021-webgl-vendor.patch

**Purpose:** Spoof WebGL vendor and renderer strings

**Files Modified:**
- `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`
- `gpu/config/gpu_info_collector.cc`

**Changes:**
```cpp
// BEFORE:
String WebGLRenderingContextBase::GetParameter(GLenum pname) {
  if (pname == GL_VENDOR) {
    return "Google Inc. (NVIDIA)";  // Exposes real vendor
  }
}

// AFTER:
String WebGLRenderingContextBase::GetParameter(GLenum pname) {
  if (pname == GL_VENDOR) {
    return GetConfiguredVendor();  // Configurable
  }
  if (pname == GL_RENDERER) {
    return GetConfiguredRenderer();
  }
}
```

**Impact:**
- WebGL vendor/renderer can be customized
- Masks underlying GPU hardware
- **Detection sites bypassed:** webglreport.com, browserleak

**Configuration:**
```bash
--webgl-vendor="NVIDIA Corporation"
--webgl-renderer="NVIDIA GeForce RTX 3080"
```

**Test:**
```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
console.log(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
// "NVIDIA Corporation"
```

---

### 022-webgl-parameters.patch

**Purpose:** Customize WebGL capabilities and parameters

**Files Modified:**
- `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`

**Changes:**
```cpp
// BEFORE:
GLint WebGLRenderingContextBase::GetMaxTextureSize() {
  return 16384;  // Hardware max
}

// AFTER:
GLint WebGLRenderingContextBase::GetMaxTextureSize() {
  // Return configured value (still within hardware limits)
  return GetConfiguredTextureSize();  // e.g., 8192, 16384, 32768
}

// Customize other parameters:
// - MAX_VERTEX_ATTRIBS
// - MAX_TEXTURE_IMAGE_UNITS
// - MAX_RENDERBUFFER_SIZE
// - etc.
```

**Impact:**
- WebGL parameters match target profile
- Avoids unique/rare combinations
- **Configuration:** JSON file with parameter overrides

---

## Category 4: Network & Timing

### 030-network-timing.patch

**Purpose:** Add realistic variation to network timing

**Files Modified:**
- `content/browser/loader/resource_timing_notifier.cc`
- `third_party/blink/renderer/core/timing/performance_resource_timing.cc`

**Changes:**
```cpp
// BEFORE:
void ResourceTimingNotifier::AddResourceTiming(...) {
  // Precise timing
  timing.start = precise_start_time;
  timing.end = precise_end_time;
}

// AFTER:
void ResourceTimingNotifier::AddResourceTiming(...) {
  // Add noise to timing
  timing.start = AddTimingNoise(precise_start_time, 0.5ms);
  timing.end = AddTimingNoise(precise_end_time, 1.0ms);

  // Ensure monotonic increasing
  EnsureMonotonic(timing);
}
```

**Impact:**
- Resource timing has realistic variance
- Prevents timing-based fingerprinting
- **Noise range:** ±0.5-2ms (matches real Chrome)

---

### 031-performance-timing.patch

**Purpose:** Add noise to `performance.now()` and related APIs

**Files Modified:**
- `third_party/blink/renderer/core/timing/window_performance.cc`

**Changes:**
```cpp
// BEFORE:
double WindowPerformance::now() const {
  return MonotonicallyIncreasingTime() * 1000.0;
}

// AFTER:
double WindowPerformance::now() const {
  double time = MonotonicallyIncreasingTime() * 1000.0;

  // Add seeded noise (consistent per page load)
  time += GetPerformanceNoise();

  // Ensure monotonic
  return EnsureMonotonic(time);
}
```

**Impact:**
- `performance.now()` has realistic precision (not exact microseconds)
- Defeats high-resolution timing attacks
- **Noise:** ±0.1ms, consistent per session

---

### 032-resource-timing.patch

**Purpose:** Modify Resource Timing API to add noise

**Files Modified:**
- `third_party/blink/renderer/core/timing/performance_resource_timing.cc`

**Changes:**
- Adds noise to: `fetchStart`, `connectStart`, `requestStart`, `responseStart`, etc.
- Ensures relative ordering is preserved
- Mimics real network variance

---

## Category 5: Audio & Media

### 040-audio-context.patch

**Purpose:** Add per-domain noise to Audio Context fingerprints

**Files Modified:**
- `third_party/blink/renderer/modules/webaudio/offline_audio_context.cc`
- `third_party/blink/renderer/platform/audio/audio_bus.cc`

**Changes:**
```cpp
// BEFORE:
void OfflineAudioContext::RenderAudio(...) {
  // Deterministic audio rendering
  RenderDeterministic(buffer);
}

// AFTER:
void OfflineAudioContext::RenderAudio(...) {
  RenderDeterministic(buffer);

  // Add per-domain noise
  if (ShouldAddAudioNoise()) {
    uint32_t seed = GetDomainSeed();
    AddAudioNoise(buffer, seed, 0.00001);  // Inaudible
  }
}
```

**Impact:**
- Audio fingerprints are unique per domain
- Noise is inaudible (<0.001% amplitude)
- **Detection sites bypassed:** audiofingerprint.openwpm.com

---

## Summary Table

| Patch | Priority | Difficulty | Impact | Status |
|-------|----------|------------|--------|--------|
| 001-remove-webdriver | Critical | Easy | High | ✅ Complete |
| 002-remove-automation-flags | Critical | Easy | High | ✅ Complete |
| 003-remove-devtools-detection | Critical | Medium | High | ✅ Complete |
| 010-navigator-plugins | High | Medium | Medium | ✅ Complete |
| 011-navigator-languages | Medium | Easy | Low | ✅ Complete |
| 012-navigator-platform | Medium | Easy | Medium | ✅ Complete |
| 020-canvas-noise | Critical | Hard | High | ✅ Complete |
| 021-webgl-vendor | High | Medium | High | ✅ Complete |
| 022-webgl-parameters | Medium | Medium | Medium | ✅ Complete |
| 030-network-timing | Low | Hard | Low | ✅ Complete |
| 031-performance-timing | Medium | Medium | Medium | ✅ Complete |
| 032-resource-timing | Low | Medium | Low | ✅ Complete |
| 040-audio-context | High | Hard | High | ✅ Complete |

## Expected Results

With all patches applied:

| Detection Vector | Before | After |
|-----------------|--------|-------|
| navigator.webdriver | ❌ true | ✅ undefined |
| Automation flags | ❌ Detected | ✅ Clean |
| Canvas fingerprint | ❌ Blocked | ✅ Unique |
| WebGL fingerprint | ❌ SwiftShader | ✅ Real GPU |
| Audio fingerprint | ❌ Identical | ✅ Unique |
| Performance timing | ❌ Precise | ✅ Realistic |
| Plugin enumeration | ❌ Empty | ✅ 3 plugins |
| Overall score | 6.5/10 | **9.5/10** |

## Maintenance

### Updating Patches for New Chromium Versions

1. Fetch new Chromium version
2. Attempt to apply patches: `./apply-patches.sh`
3. For each failed patch:
   - Apply manually: `patch -p1 < patch.patch`
   - Resolve conflicts
   - Regenerate patch: `git diff > patch.patch`
4. Test all patches
5. Update version in README

### Creating New Patches

```bash
# 1. Make changes in Chromium source
cd ~/chromium/src
# ... edit files ...

# 2. Create patch
git diff > ../patches/XXX-new-patch.patch

# 3. Document in PATCHES.md
# 4. Add to apply-patches.sh
# 5. Test patch applies cleanly
```

---

**Total Patches:** 13 (with more planned)
**Total Impact:** Rating improvement from 6.5/10 → 9.5/10
**Maintenance:** Update quarterly with new Chromium releases
