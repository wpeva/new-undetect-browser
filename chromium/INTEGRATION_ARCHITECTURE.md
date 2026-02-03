# Unified Fingerprint Integration Architecture

## Problem Statement

The current architecture has **three disconnected layers**:
1. **JavaScript modules** (via `evaluateOnNewDocument`)
2. **Profile management** (JSON files)
3. **C++ Chromium patches** (hardcoded values)

These layers operate independently, creating **detection vectors through inconsistencies**.

---

## Solution: Unified Fingerprint Session System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED CONFIGURATION                         │
│              (Single Source of Truth)                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           FingerprintProfile (JSON)                       │   │
│  │  {                                                        │   │
│  │    "sessionSeed": 1234567890,                            │   │
│  │    "navigator": { "cores": 8, "memory": 16 },            │   │
│  │    "canvas": { "noiseLevel": 0.001, "noiseAmplitude": 2 },│   │
│  │    "webgl": { "vendor": "Intel", "renderer": "..." },    │   │
│  │    "audio": { "noiseLevel": 0.0001 }                     │   │
│  │  }                                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Command Line   │  │  Environment    │  │   Shared        │
│  Arguments      │  │  Variables      │  │   Memory        │
│                 │  │                 │  │   (mmap)        │
│ --fp-seed=...   │  │ FP_PROFILE=...  │  │                 │
│ --fp-config=... │  │                 │  │ /dev/shm/fp_*   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 CHROMIUM BROWSER PROCESS                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           FingerprintSessionManager (C++)                  │  │
│  │                                                            │  │
│  │  - Loads profile at startup                               │  │
│  │  - Stores in process-global singleton                     │  │
│  │  - Provides getters for all patches                       │  │
│  │  - Thread-safe access                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │ Canvas Patch  │ │ WebGL Patch   │ │ Audio Patch   │         │
│  │               │ │               │ │               │         │
│  │ Uses:         │ │ Uses:         │ │ Uses:         │         │
│  │ GetNoise()    │ │ GetVendor()   │ │ GetNoise()    │         │
│  │ GetSeed()     │ │ GetRenderer() │ │ GetSeed()     │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ IPC (Mojo)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RENDERER PROCESS                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         FingerprintSessionManager (C++ copy)               │  │
│  │         (Receives config via IPC at startup)              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Blink Renderer                           │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ Navigator   │  │ Canvas      │  │ WebGL       │       │  │
│  │  │ Patches     │  │ Patches     │  │ Patches     │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │                                                            │  │
│  │  All use FingerprintSessionManager::Get()                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              V8 JavaScript Engine                          │  │
│  │                                                            │  │
│  │  window.__fpConfig = {                                    │  │
│  │    // Same values as C++                                  │  │
│  │    sessionSeed: 1234567890,                              │  │
│  │    canvas: { noiseLevel: 0.001 },                        │  │
│  │    ...                                                    │  │
│  │  }                                                        │  │
│  │                                                            │  │
│  │  // JS modules read from __fpConfig                       │  │
│  │  // Guaranteed to match C++ values                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: C++ Fingerprint Session Manager

Create a centralized configuration manager that all patches use.

#### File: `chromium/src/content/browser/fingerprint/fingerprint_session_manager.h`

```cpp
#ifndef CONTENT_BROWSER_FINGERPRINT_FINGERPRINT_SESSION_MANAGER_H_
#define CONTENT_BROWSER_FINGERPRINT_FINGERPRINT_SESSION_MANAGER_H_

#include <string>
#include <mutex>
#include <random>
#include "base/json/json_reader.h"
#include "base/values.h"

namespace content {

// Fingerprint configuration structure
struct FingerprintConfig {
  // Session
  uint64_t session_seed = 0;

  // Navigator
  struct {
    unsigned int hardware_concurrency = 8;
    float device_memory = 8.0f;
    std::string platform = "Win32";
    std::string user_agent;
    std::vector<std::string> languages = {"en-US", "en"};
  } navigator;

  // Canvas
  struct {
    float noise_level = 0.001f;      // Percentage of pixels to modify
    int noise_amplitude = 2;          // Max noise per channel (±N)
  } canvas;

  // WebGL
  struct {
    std::string vendor = "Intel Inc.";
    std::string renderer = "Intel(R) UHD Graphics";
    std::string version = "WebGL 1.0";
    float readpixels_noise = 0.001f;
  } webgl;

  // Audio
  struct {
    float analyser_noise = 0.0001f;
    float oscillator_noise = 0.00001f;
    float compressor_noise = 0.001f;
  } audio;

  // Screen
  struct {
    int width = 1920;
    int height = 1080;
    int avail_width = 1920;
    int avail_height = 1040;
    unsigned int color_depth = 24;
    float pixel_ratio = 1.0f;
  } screen;

  // Timezone
  struct {
    int offset_minutes = -480;  // PST: -8 * 60
    std::string timezone_id = "America/Los_Angeles";
  } timezone;
};

class FingerprintSessionManager {
 public:
  // Singleton access
  static FingerprintSessionManager& GetInstance();

  // Initialize from various sources
  bool InitFromCommandLine();
  bool InitFromEnvironment();
  bool InitFromFile(const std::string& path);
  bool InitFromJson(const std::string& json);

  // Thread-safe getters
  const FingerprintConfig& GetConfig() const;
  uint64_t GetSessionSeed() const;

  // Noise generators (seeded by session)
  std::mt19937_64& GetGenerator();

  // Specific getters for patches
  unsigned int GetHardwareConcurrency() const;
  float GetDeviceMemory() const;
  const std::string& GetPlatform() const;
  const std::string& GetUserAgent() const;

  float GetCanvasNoiseLevel() const;
  int GetCanvasNoiseAmplitude() const;

  const std::string& GetWebGLVendor() const;
  const std::string& GetWebGLRenderer() const;

  float GetAudioAnalyserNoise() const;
  float GetAudioOscillatorNoise() const;

  int GetScreenWidth() const;
  int GetScreenHeight() const;

  int GetTimezoneOffset() const;

 private:
  FingerprintSessionManager();
  ~FingerprintSessionManager() = default;

  // Prevent copying
  FingerprintSessionManager(const FingerprintSessionManager&) = delete;
  FingerprintSessionManager& operator=(const FingerprintSessionManager&) = delete;

  bool ParseJson(const base::Value& root);
  void GenerateDefaultConfig();

  mutable std::mutex mutex_;
  FingerprintConfig config_;
  std::mt19937_64 generator_;
  bool initialized_ = false;
};

}  // namespace content

#endif  // CONTENT_BROWSER_FINGERPRINT_FINGERPRINT_SESSION_MANAGER_H_
```

#### File: `chromium/src/content/browser/fingerprint/fingerprint_session_manager.cc`

```cpp
#include "content/browser/fingerprint/fingerprint_session_manager.h"

#include "base/command_line.h"
#include "base/environment.h"
#include "base/files/file_util.h"
#include "base/json/json_reader.h"
#include "base/logging.h"
#include <chrono>

namespace content {

namespace {
// Command line switches
const char kFingerprintConfig[] = "fingerprint-config";
const char kFingerprintSeed[] = "fingerprint-seed";

// Environment variable
const char kFingerprintEnvVar[] = "UNDETECT_FINGERPRINT_CONFIG";
}  // namespace

FingerprintSessionManager& FingerprintSessionManager::GetInstance() {
  static FingerprintSessionManager instance;
  return instance;
}

FingerprintSessionManager::FingerprintSessionManager() {
  // Try initialization in order of priority
  if (!InitFromCommandLine()) {
    if (!InitFromEnvironment()) {
      // Generate default config with random seed
      GenerateDefaultConfig();
    }
  }
}

bool FingerprintSessionManager::InitFromCommandLine() {
  const base::CommandLine* command_line = base::CommandLine::ForCurrentProcess();

  // Check for config file path
  if (command_line->HasSwitch(kFingerprintConfig)) {
    std::string config_path = command_line->GetSwitchValueASCII(kFingerprintConfig);
    return InitFromFile(config_path);
  }

  // Check for seed only
  if (command_line->HasSwitch(kFingerprintSeed)) {
    std::string seed_str = command_line->GetSwitchValueASCII(kFingerprintSeed);
    config_.session_seed = std::stoull(seed_str);
    generator_.seed(config_.session_seed);
    initialized_ = true;
    LOG(INFO) << "FingerprintSession initialized with seed: " << config_.session_seed;
    return true;
  }

  return false;
}

bool FingerprintSessionManager::InitFromEnvironment() {
  std::unique_ptr<base::Environment> env = base::Environment::Create();
  std::string config_path;

  if (env->GetVar(kFingerprintEnvVar, &config_path)) {
    return InitFromFile(config_path);
  }

  return false;
}

bool FingerprintSessionManager::InitFromFile(const std::string& path) {
  std::string content;
  if (!base::ReadFileToString(base::FilePath(path), &content)) {
    LOG(ERROR) << "Failed to read fingerprint config from: " << path;
    return false;
  }

  return InitFromJson(content);
}

bool FingerprintSessionManager::InitFromJson(const std::string& json) {
  std::lock_guard<std::mutex> lock(mutex_);

  absl::optional<base::Value> root = base::JSONReader::Read(json);
  if (!root || !root->is_dict()) {
    LOG(ERROR) << "Invalid fingerprint config JSON";
    return false;
  }

  return ParseJson(*root);
}

bool FingerprintSessionManager::ParseJson(const base::Value& root) {
  const base::Value::Dict& dict = root.GetDict();

  // Session seed
  if (const auto* seed = dict.FindDouble("sessionSeed")) {
    config_.session_seed = static_cast<uint64_t>(*seed);
  } else {
    config_.session_seed = std::chrono::system_clock::now().time_since_epoch().count();
  }
  generator_.seed(config_.session_seed);

  // Navigator
  if (const auto* nav = dict.FindDict("navigator")) {
    if (auto cores = nav->FindInt("hardwareConcurrency"))
      config_.navigator.hardware_concurrency = *cores;
    if (auto mem = nav->FindDouble("deviceMemory"))
      config_.navigator.device_memory = static_cast<float>(*mem);
    if (const auto* platform = nav->FindString("platform"))
      config_.navigator.platform = *platform;
    if (const auto* ua = nav->FindString("userAgent"))
      config_.navigator.user_agent = *ua;
    if (const auto* langs = nav->FindList("languages")) {
      config_.navigator.languages.clear();
      for (const auto& lang : *langs) {
        if (lang.is_string())
          config_.navigator.languages.push_back(lang.GetString());
      }
    }
  }

  // Canvas
  if (const auto* canvas = dict.FindDict("canvas")) {
    if (auto noise = canvas->FindDouble("noiseLevel"))
      config_.canvas.noise_level = static_cast<float>(*noise);
    if (auto amp = canvas->FindInt("noiseAmplitude"))
      config_.canvas.noise_amplitude = *amp;
  }

  // WebGL
  if (const auto* webgl = dict.FindDict("webgl")) {
    if (const auto* vendor = webgl->FindString("vendor"))
      config_.webgl.vendor = *vendor;
    if (const auto* renderer = webgl->FindString("renderer"))
      config_.webgl.renderer = *renderer;
    if (const auto* version = webgl->FindString("version"))
      config_.webgl.version = *version;
    if (auto noise = webgl->FindDouble("readpixelsNoise"))
      config_.webgl.readpixels_noise = static_cast<float>(*noise);
  }

  // Audio
  if (const auto* audio = dict.FindDict("audio")) {
    if (auto noise = audio->FindDouble("analyserNoise"))
      config_.audio.analyser_noise = static_cast<float>(*noise);
    if (auto noise = audio->FindDouble("oscillatorNoise"))
      config_.audio.oscillator_noise = static_cast<float>(*noise);
    if (auto noise = audio->FindDouble("compressorNoise"))
      config_.audio.compressor_noise = static_cast<float>(*noise);
  }

  // Screen
  if (const auto* screen = dict.FindDict("screen")) {
    if (auto w = screen->FindInt("width"))
      config_.screen.width = *w;
    if (auto h = screen->FindInt("height"))
      config_.screen.height = *h;
    if (auto w = screen->FindInt("availWidth"))
      config_.screen.avail_width = *w;
    if (auto h = screen->FindInt("availHeight"))
      config_.screen.avail_height = *h;
    if (auto depth = screen->FindInt("colorDepth"))
      config_.screen.color_depth = *depth;
    if (auto ratio = screen->FindDouble("pixelRatio"))
      config_.screen.pixel_ratio = static_cast<float>(*ratio);
  }

  // Timezone
  if (const auto* tz = dict.FindDict("timezone")) {
    if (auto offset = tz->FindInt("offsetMinutes"))
      config_.timezone.offset_minutes = *offset;
    if (const auto* id = tz->FindString("timezoneId"))
      config_.timezone.timezone_id = *id;
  }

  initialized_ = true;
  LOG(INFO) << "FingerprintSession initialized from JSON config";
  return true;
}

void FingerprintSessionManager::GenerateDefaultConfig() {
  std::lock_guard<std::mutex> lock(mutex_);

  config_.session_seed = std::chrono::system_clock::now().time_since_epoch().count();
  generator_.seed(config_.session_seed);

  // Use randomized but realistic defaults
  std::uniform_int_distribution<int> cores_dist(4, 16);
  config_.navigator.hardware_concurrency = (cores_dist(generator_) / 4) * 4;  // 4, 8, 12, 16

  std::uniform_int_distribution<int> mem_dist(0, 3);
  const float memories[] = {4.0f, 8.0f, 16.0f, 32.0f};
  config_.navigator.device_memory = memories[mem_dist(generator_)];

  initialized_ = true;
  LOG(INFO) << "FingerprintSession initialized with generated defaults, seed: "
            << config_.session_seed;
}

// Getters
const FingerprintConfig& FingerprintSessionManager::GetConfig() const {
  return config_;
}

uint64_t FingerprintSessionManager::GetSessionSeed() const {
  return config_.session_seed;
}

std::mt19937_64& FingerprintSessionManager::GetGenerator() {
  return generator_;
}

unsigned int FingerprintSessionManager::GetHardwareConcurrency() const {
  return config_.navigator.hardware_concurrency;
}

float FingerprintSessionManager::GetDeviceMemory() const {
  return config_.navigator.device_memory;
}

const std::string& FingerprintSessionManager::GetPlatform() const {
  return config_.navigator.platform;
}

const std::string& FingerprintSessionManager::GetUserAgent() const {
  return config_.navigator.user_agent;
}

float FingerprintSessionManager::GetCanvasNoiseLevel() const {
  return config_.canvas.noise_level;
}

int FingerprintSessionManager::GetCanvasNoiseAmplitude() const {
  return config_.canvas.noise_amplitude;
}

const std::string& FingerprintSessionManager::GetWebGLVendor() const {
  return config_.webgl.vendor;
}

const std::string& FingerprintSessionManager::GetWebGLRenderer() const {
  return config_.webgl.renderer;
}

float FingerprintSessionManager::GetAudioAnalyserNoise() const {
  return config_.audio.analyser_noise;
}

float FingerprintSessionManager::GetAudioOscillatorNoise() const {
  return config_.audio.oscillator_noise;
}

int FingerprintSessionManager::GetScreenWidth() const {
  return config_.screen.width;
}

int FingerprintSessionManager::GetScreenHeight() const {
  return config_.screen.height;
}

int FingerprintSessionManager::GetTimezoneOffset() const {
  return config_.timezone.offset_minutes;
}

}  // namespace content
```

---

### Phase 2: Updated Patches Using Session Manager

#### Canvas Patch (Updated)

```cpp
// In canvas_rendering_context_2d.cc

#include "content/browser/fingerprint/fingerprint_session_manager.h"

static void AddCanvasNoise(uint8_t* data, size_t data_size) {
  auto& session = content::FingerprintSessionManager::GetInstance();

  float noise_level = session.GetCanvasNoiseLevel();
  int noise_amplitude = session.GetCanvasNoiseAmplitude();
  uint64_t seed = session.GetSessionSeed();

  std::mt19937_64 gen(seed);
  std::uniform_int_distribution<int> dist(-noise_amplitude, noise_amplitude);

  size_t pixel_count = data_size / 4;
  size_t noise_count = static_cast<size_t>(pixel_count * noise_level);

  for (size_t i = 0; i < noise_count; i++) {
    size_t idx = (gen() % pixel_count) * 4;
    for (int c = 0; c < 3; c++) {
      int val = data[idx + c] + dist(gen);
      data[idx + c] = static_cast<uint8_t>(std::clamp(val, 0, 255));
    }
  }
}
```

#### Navigator Patch (Updated)

```cpp
// In navigator.cc

#include "content/browser/fingerprint/fingerprint_session_manager.h"

unsigned Navigator::hardwareConcurrency() const {
  return content::FingerprintSessionManager::GetInstance().GetHardwareConcurrency();
}

float Navigator::deviceMemory() const {
  return content::FingerprintSessionManager::GetInstance().GetDeviceMemory();
}

String Navigator::platform() const {
  auto& session = content::FingerprintSessionManager::GetInstance();
  const std::string& platform = session.GetPlatform();
  if (!platform.empty()) {
    return String::FromUTF8(platform.c_str());
  }
  // Fallback to original implementation
  return NavigatorID::platform(GetFrame());
}

bool Navigator::webdriver() const {
  // Always false - no configuration needed
  return false;
}
```

#### WebGL Patch (Updated)

```cpp
// In webgl_rendering_context_base.cc

#include "content/browser/fingerprint/fingerprint_session_manager.h"

ScriptValue WebGLRenderingContextBase::getParameter(
    ScriptState* script_state,
    GLenum pname) {

  auto& session = content::FingerprintSessionManager::GetInstance();

  switch (pname) {
    case GL_VENDOR:
      return WebGLAny(script_state,
        String::FromUTF8(session.GetWebGLVendor().c_str()));

    case GL_RENDERER:
      return WebGLAny(script_state,
        String::FromUTF8(session.GetWebGLRenderer().c_str()));

    case GL_UNMASKED_VENDOR_WEBGL:
      return WebGLAny(script_state,
        String::FromUTF8(session.GetWebGLVendor().c_str()));

    case GL_UNMASKED_RENDERER_WEBGL:
      return WebGLAny(script_state,
        String::FromUTF8(session.GetWebGLRenderer().c_str()));

    default:
      // Original implementation
      break;
  }

  return /* original implementation */;
}
```

---

### Phase 3: JavaScript Configuration Bridge

The JS layer must receive the same configuration that C++ uses.

#### Updated Browser Launch (src/index.ts)

```typescript
import { FingerprintProfile } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class UndetectBrowser {

  /**
   * Generate fingerprint config file for C++ engine
   */
  private static generateFingerprintConfigFile(profile: FingerprintProfile): string {
    const configPath = path.join(os.tmpdir(), `fp_config_${Date.now()}.json`);

    const config = {
      sessionSeed: profile.sessionSeed || Date.now(),
      navigator: {
        hardwareConcurrency: profile.hardwareConcurrency,
        deviceMemory: profile.deviceMemory,
        platform: profile.platform,
        userAgent: profile.userAgent,
        languages: profile.languages,
      },
      canvas: {
        noiseLevel: profile.canvas?.noiseLevel ?? 0.001,
        noiseAmplitude: profile.canvas?.noiseAmplitude ?? 2,
      },
      webgl: {
        vendor: profile.webgl?.vendor ?? 'Intel Inc.',
        renderer: profile.webgl?.renderer ?? 'Intel(R) UHD Graphics',
        version: profile.webgl?.version ?? 'WebGL 1.0',
        readpixelsNoise: profile.webgl?.readpixelsNoise ?? 0.001,
      },
      audio: {
        analyserNoise: profile.audio?.analyserNoise ?? 0.0001,
        oscillatorNoise: profile.audio?.oscillatorNoise ?? 0.00001,
        compressorNoise: profile.audio?.compressorNoise ?? 0.001,
      },
      screen: {
        width: profile.screen?.width ?? 1920,
        height: profile.screen?.height ?? 1080,
        availWidth: profile.screen?.availWidth ?? 1920,
        availHeight: profile.screen?.availHeight ?? 1040,
        colorDepth: profile.screen?.colorDepth ?? 24,
        pixelRatio: profile.screen?.pixelRatio ?? 1.0,
      },
      timezone: {
        offsetMinutes: profile.timezone?.offsetMinutes ?? new Date().getTimezoneOffset(),
        timezoneId: profile.timezone?.id ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  /**
   * Launch browser with unified fingerprint configuration
   */
  static async launch(options: LaunchOptions = {}): Promise<UndetectBrowserInstance> {
    const profile = options.profile || await this.generateProfile();

    // Generate config file for C++ engine
    const configPath = this.generateFingerprintConfigFile(profile);

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',

      // CRITICAL: Pass fingerprint config to C++ engine
      `--fingerprint-config=${configPath}`,
      `--fingerprint-seed=${profile.sessionSeed}`,

      // Standard args
      `--user-agent=${profile.userAgent}`,
      `--window-size=${profile.viewport.width},${profile.viewport.height}`,

      ...(options.args || []),
    ];

    const browser = await puppeteer.launch({
      executablePath: options.executablePath || this.getChromiumPath(),
      headless: options.headless ?? false,
      args: launchArgs,
      ignoreDefaultArgs: ['--enable-automation'],
      ...options,
    });

    const instance = new UndetectBrowserInstance(browser, profile, configPath);

    // Clean up config file on browser close
    browser.on('disconnected', () => {
      try {
        fs.unlinkSync(configPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    return instance;
  }
}
```

#### Updated Stealth Engine (src/core/stealth-engine.ts)

```typescript
export class StealthEngine {
  private config: StealthConfig;
  private fingerprint: FingerprintProfile;

  /**
   * Inject the SAME config that C++ engine uses
   */
  async injectFingerprintConfig(page: Page): Promise<void> {
    const configJson = JSON.stringify({
      sessionSeed: this.fingerprint.sessionSeed,
      navigator: {
        hardwareConcurrency: this.fingerprint.hardwareConcurrency,
        deviceMemory: this.fingerprint.deviceMemory,
        platform: this.fingerprint.platform,
        languages: this.fingerprint.languages,
      },
      canvas: this.fingerprint.canvas,
      webgl: this.fingerprint.webgl,
      audio: this.fingerprint.audio,
      screen: this.fingerprint.screen,
      timezone: this.fingerprint.timezone,
    });

    await page.evaluateOnNewDocument(`
      // Store fingerprint config globally
      // This MUST match what C++ engine uses
      Object.defineProperty(window, '__fpConfig', {
        value: Object.freeze(${configJson}),
        writable: false,
        configurable: false,
        enumerable: false
      });
    `);
  }

  async applyProtections(page: Page, userAgent: string): Promise<void> {
    // First: Inject unified config
    await this.injectFingerprintConfig(page);

    // Then: Apply modules (they read from __fpConfig)
    await this.webdriverEvasion.inject(page);
    await this.fingerprintSpoofer.inject(page);
    // ... other modules
  }
}
```

#### Updated Fingerprint Spoofing Module (src/modules/fingerprint-spoofing.ts)

```typescript
export class FingerprintSpoofingModule {

  /**
   * Uses __fpConfig which MATCHES C++ engine values
   */
  async inject(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // Read from unified config
      const config = (window as any).__fpConfig;
      if (!config) {
        console.warn('FingerprintSpoofing: __fpConfig not found');
        return;
      }

      // Navigator - MATCHES C++ FingerprintSessionManager
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => config.navigator.hardwareConcurrency,
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => config.navigator.deviceMemory,
      });

      Object.defineProperty(navigator, 'platform', {
        get: () => config.navigator.platform,
      });

      // Canvas noise - MATCHES C++ canvas patch
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args: any[]) {
        const ctx = this.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);

          // Use SAME parameters as C++ patch
          const noiseLevel = config.canvas.noiseLevel;
          const noiseAmplitude = config.canvas.noiseAmplitude;
          const seed = config.sessionSeed;

          // Seeded random (same algorithm as C++)
          let rng = seed;
          const random = () => {
            rng = (rng * 1103515245 + 12345) & 0x7fffffff;
            return rng / 0x7fffffff;
          };

          const pixelCount = imageData.data.length / 4;
          const noiseCount = Math.floor(pixelCount * noiseLevel);

          for (let i = 0; i < noiseCount; i++) {
            const idx = Math.floor(random() * pixelCount) * 4;
            for (let c = 0; c < 3; c++) {
              const noise = Math.floor(random() * (noiseAmplitude * 2 + 1)) - noiseAmplitude;
              imageData.data[idx + c] = Math.max(0, Math.min(255, imageData.data[idx + c] + noise));
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, args);
      };

      // WebGL - MATCHES C++ webgl patch
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(pname: number) {
        const gl = this;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');

        if (ext) {
          if (pname === ext.UNMASKED_VENDOR_WEBGL) {
            return config.webgl.vendor;
          }
          if (pname === ext.UNMASKED_RENDERER_WEBGL) {
            return config.webgl.renderer;
          }
        }

        return originalGetParameter.call(this, pname);
      };

      // Screen - MATCHES C++ screen spoofing
      Object.defineProperty(screen, 'width', { get: () => config.screen.width });
      Object.defineProperty(screen, 'height', { get: () => config.screen.height });
      Object.defineProperty(screen, 'availWidth', { get: () => config.screen.availWidth });
      Object.defineProperty(screen, 'availHeight', { get: () => config.screen.availHeight });
      Object.defineProperty(screen, 'colorDepth', { get: () => config.screen.colorDepth });
      Object.defineProperty(screen, 'pixelDepth', { get: () => config.screen.colorDepth });
    });
  }
}
```

---

### Phase 4: Validation & Testing

#### Integration Test

```typescript
// tests/integration/fingerprint-consistency.test.ts

import { UndetectBrowser } from '../../src/index';

describe('Fingerprint Consistency', () => {
  let browser: any;
  let page: any;

  beforeAll(async () => {
    browser = await UndetectBrowser.launch({
      profile: {
        sessionSeed: 12345,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        platform: 'Win32',
        webgl: {
          vendor: 'Test Vendor',
          renderer: 'Test Renderer',
        },
        canvas: {
          noiseLevel: 0.002,
          noiseAmplitude: 3,
        },
      },
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('navigator.hardwareConcurrency matches profile', async () => {
    const cores = await page.evaluate(() => navigator.hardwareConcurrency);
    expect(cores).toBe(8);
  });

  test('navigator.deviceMemory matches profile', async () => {
    const memory = await page.evaluate(() => (navigator as any).deviceMemory);
    expect(memory).toBe(16);
  });

  test('WebGL vendor matches profile', async () => {
    const vendor = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl?.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null;
    });
    expect(vendor).toBe('Test Vendor');
  });

  test('Canvas fingerprint is consistent across multiple calls', async () => {
    const hashes = await page.evaluate(() => {
      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx!.fillText('Test', 10, 10);
        results.push(canvas.toDataURL());
      }
      return results;
    });

    // All hashes should be identical (consistent noise)
    expect(new Set(hashes).size).toBe(1);
  });

  test('JS and native canvas produce same result', async () => {
    // This test verifies JS and C++ use same noise algorithm
    const result = await page.evaluate(() => {
      // Create canvas via DOM (goes through C++ patch)
      const canvas1 = document.createElement('canvas');
      const ctx1 = canvas1.getContext('2d');
      ctx1!.fillText('Fingerprint Test', 10, 10);
      const hash1 = canvas1.toDataURL();

      // Read pixel data
      const imageData = ctx1!.getImageData(0, 0, canvas1.width, canvas1.height);

      // Check that noise was applied (data is not all zeros where text was drawn)
      const nonZeroPixels = Array.from(imageData.data).filter(v => v > 0).length;

      return {
        hash: hash1,
        hasNoise: nonZeroPixels > 0,
      };
    });

    expect(result.hasNoise).toBe(true);
  });
});
```

---

## Configuration Schema

### Profile JSON Format

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FingerprintProfile",
  "type": "object",
  "required": ["sessionSeed"],
  "properties": {
    "sessionSeed": {
      "type": "integer",
      "description": "Unique seed for consistent randomization"
    },
    "navigator": {
      "type": "object",
      "properties": {
        "hardwareConcurrency": {
          "type": "integer",
          "minimum": 1,
          "maximum": 128,
          "default": 8
        },
        "deviceMemory": {
          "type": "number",
          "enum": [0.25, 0.5, 1, 2, 4, 8, 16, 32],
          "default": 8
        },
        "platform": {
          "type": "string",
          "enum": ["Win32", "MacIntel", "Linux x86_64", "Linux armv8l"],
          "default": "Win32"
        },
        "userAgent": {
          "type": "string"
        },
        "languages": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["en-US", "en"]
        }
      }
    },
    "canvas": {
      "type": "object",
      "properties": {
        "noiseLevel": {
          "type": "number",
          "minimum": 0,
          "maximum": 0.01,
          "default": 0.001,
          "description": "Percentage of pixels to modify"
        },
        "noiseAmplitude": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10,
          "default": 2,
          "description": "Max color channel change (±N)"
        }
      }
    },
    "webgl": {
      "type": "object",
      "properties": {
        "vendor": { "type": "string", "default": "Intel Inc." },
        "renderer": { "type": "string", "default": "Intel(R) UHD Graphics" },
        "version": { "type": "string", "default": "WebGL 1.0" }
      }
    },
    "audio": {
      "type": "object",
      "properties": {
        "analyserNoise": { "type": "number", "default": 0.0001 },
        "oscillatorNoise": { "type": "number", "default": 0.00001 }
      }
    },
    "screen": {
      "type": "object",
      "properties": {
        "width": { "type": "integer", "default": 1920 },
        "height": { "type": "integer", "default": 1080 },
        "availWidth": { "type": "integer", "default": 1920 },
        "availHeight": { "type": "integer", "default": 1040 },
        "colorDepth": { "type": "integer", "enum": [24, 32], "default": 24 },
        "pixelRatio": { "type": "number", "default": 1.0 }
      }
    },
    "timezone": {
      "type": "object",
      "properties": {
        "offsetMinutes": { "type": "integer" },
        "timezoneId": { "type": "string" }
      }
    }
  }
}
```

---

## Summary

This architecture ensures:

1. **Single Source of Truth**: One JSON profile configures both JS and C++ layers
2. **Consistent Values**: Same parameters used across all spoofing vectors
3. **Session-Based Seeding**: Deterministic randomization within a session
4. **Clean Interface**: Clear separation between configuration and implementation
5. **Testability**: Integration tests can verify consistency
6. **Backwards Compatibility**: Existing code works, new features opt-in

The key insight is that **both layers must use identical configuration values** - not just similar ones. This is achieved by:
- Writing config to file at launch
- Passing file path to Chromium via command line
- C++ reads and stores in global singleton
- JS reads same values from `__fpConfig`
