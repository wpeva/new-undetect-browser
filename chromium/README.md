# Custom Chromium Integration - Anti-Detection Browser

This directory contains everything needed to build and integrate a custom-patched Chromium browser with advanced anti-detection capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Build Options](#build-options)
- [Patches](#patches)
- [Configuration](#configuration)
- [Integration](#integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This custom Chromium build includes patches specifically designed to bypass sophisticated bot detection systems. It's based on ungoogled-chromium with additional anti-fingerprinting and anti-detection modifications.

### Key Modifications

1. **Canvas Fingerprinting Protection** - Adds subtle noise to canvas operations
2. **WebGL Protection** - Spoofs GPU information and adds noise to pixel reads
3. **CDP Removal** - Eliminates Chrome DevTools Protocol detection vectors
4. **Permissions Stealth** - Realistic permission query handling
5. **Automation Detection Removal** - Removes all automation-related flags and variables

## ✨ Features

### Anti-Detection Patches

- ✅ Canvas noise injection (0.05-0.1% pixel modification)
- ✅ WebGL parameter spoofing (vendor, renderer, version)
- ✅ WebGL readPixels noise addition
- ✅ CDP (Chrome DevTools Protocol) hiding
- ✅ `navigator.webdriver` forced to `false`
- ✅ Automation control variables removal (`$cdc_`, `$wdc_`, etc.)
- ✅ DevTools window creation blocking
- ✅ Realistic permission query delays
- ✅ enable-automation flag removal

### Base Features (from ungoogled-chromium)

- ❌ Google integration removed
- ❌ Crash reporting disabled
- ❌ Telemetry disabled
- ❌ Safe browsing disabled
- ✅ Enhanced privacy settings

## 🚀 Quick Start

### Option 1: Download Pre-built (Fastest)

```bash
cd chromium
./build.sh 2
```

**Note:** Pre-built binaries don't include our anti-detection patches. For maximum protection, use Option 2 or 3.

### Option 2: Build from Source (Recommended)

```bash
cd chromium
./build.sh 1
```

**Requirements:**
- 40GB+ free disk space
- 8GB+ RAM (16GB recommended)
- 4+ CPU cores
- 3-6 hours build time

### Option 3: Build with Docker (Easiest)

```bash
cd chromium
./build.sh 3
```

**Requirements:**
- Docker installed
- 40GB+ free disk space
- Same resources as Option 2

## 🔧 Build Options

The `build.sh` script provides multiple build options:

```bash
./build.sh [option]

Options:
  1 - Full build from source (maximum customization)
  2 - Download pre-built ungoogled-chromium (faster, no patches)
  3 - Build with Docker (easier setup)
  4 - Apply patches only (requires existing Chromium source)
  5 - Clean build artifacts
  6 - Exit
```

### Environment Variables

```bash
# Set specific Chromium version
export CHROMIUM_VERSION=122.0.6261.94
export UNGOOGLED_VERSION=122.0.6261.94-1

# Run build
./build.sh 1
```

## 🩹 Patches

All patches are located in `patches/` directory:

### 1. Canvas Noise Patch (`canvas-noise.patch`)

Modifies canvas rendering to add imperceptible noise:

```cpp
// Adds noise to 0.1% of pixels with ±2 RGB value changes
// Uses session-based seed for consistency
// Only affects RGB channels (not alpha)
```

**Files modified:**
- `third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc`
- `third_party/blink/renderer/core/html/canvas/html_canvas_element.cc`

### 2. WebGL Fingerprint Patch (`webgl-fingerprint.patch`)

Spoofs WebGL parameters and adds noise to pixel reads:

```cpp
// Spoofed parameters:
// - GL_RENDERER → Generic Intel renderer
// - GL_VENDOR → Google Inc. (Intel)
// - GL_UNMASKED_VENDOR_WEBGL → Intel Inc.
// - GL_UNMASKED_RENDERER_WEBGL → Intel(R) UHD Graphics
```

**Files modified:**
- `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`
- `third_party/blink/renderer/modules/webgl/webgl_debug_renderer_info.idl`

### 3. CDP Removal Patch (`cdp-removal.patch`)

Removes Chrome DevTools Protocol detection vectors:

- Disables DevTools HTTP handler
- Blocks DevTools window creation
- Limits inspector capabilities
- Forces `navigator.webdriver` to `false`

**Files modified:**
- `content/browser/devtools/devtools_http_handler.cc`
- `third_party/blink/renderer/core/inspector/inspector_dom_agent.cc`
- `v8/src/inspector/v8-console.cc`
- `chrome/browser/devtools/devtools_window.cc`
- `third_party/blink/renderer/core/frame/navigator.cc`

### 4. Permissions Stealth Patch (`permissions-stealth.patch`)

Adds realistic delays and responses to permission queries:

- 5-25ms realistic delays
- Returns "prompt" instead of "denied" for notifications/geolocation
- Mimics real browser behavior

**Files modified:**
- `chrome/browser/permissions/permission_manager.cc`
- `third_party/blink/renderer/modules/permissions/navigator_permissions.cc`

### 5. Automation Removal Patch (`automation-removal.patch`)

Removes all automation detection variables:

```javascript
// Removed variables:
$cdc_, $chrome_, __webdriver_, __selenium_, __fxdriver_,
__driver_, __nightmare, callPhantom, _phantom, phantom,
spawn, and many more...
```

**Files modified:**
- `chrome/test/chromedriver/chrome_launcher.cc`
- `content/browser/renderer_host/render_frame_host_impl.cc`
- `third_party/blink/renderer/core/exported/web_view_impl.cc`
- `chrome/renderer/chrome_content_renderer_client.cc`
- `third_party/blink/renderer/bindings/core/v8/v8_initializer.cc`

## ⚙️ Configuration

### Launch Flags

Use the provided flags configuration:

```bash
chromium/chrome $(cat chromium/config/chromium-flags.conf)
```

### Custom Flags

```bash
# Example: Custom user agent and window size
chromium/chrome \
  --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  --window-size=1920,1080 \
  --disable-blink-features=AutomationControlled \
  --no-sandbox
```

### Integration with Node.js

```typescript
import { launch } from 'puppeteer-core';

const browser = await launch({
  executablePath: '/path/to/chromium/chrome',
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    // Add more flags from config/chromium-flags.conf
  ],
  headless: false,
});
```

## 🔗 Integration

### With Existing Undetect-Browser

1. **Build Chromium:**
   ```bash
   cd chromium
   ./build.sh 3
   ```

2. **Extract binaries:**
   ```bash
   cd output
   tar -xzf chromium-*.tar.gz
   ```

3. **Update browser factory:**
   ```typescript
   // In src/core/realistic-browser-factory.ts
   const chromiumPath = '/path/to/chromium/chrome';
   ```

4. **Configure launch options:**
   ```typescript
   import { readFileSync } from 'fs';

   const flags = readFileSync('chromium/config/chromium-flags.conf', 'utf-8')
     .split('\n')
     .filter(line => line && !line.startsWith('#'));

   const browser = await launch({
     executablePath: chromiumPath,
     args: flags,
   });
   ```

## 🧪 Testing

### Verify Anti-Detection Features

1. **Bot Detection Tests:**
   ```bash
   # Visit these sites with your build:
   - https://bot.sannysoft.com/
   - https://pixelscan.net/
   - https://arh.antoinevastel.com/bots/areyouheadless
   - https://fingerprintjs.com/demo
   ```

2. **Automated Testing:**
   ```bash
   npm run test:detection
   ```

3. **Canvas Fingerprint Test:**
   ```javascript
   const canvas = document.createElement('canvas');
   const ctx = canvas.getContext('2d');
   ctx.fillText('Test', 0, 0);
   const fp1 = canvas.toDataURL();
   const fp2 = canvas.toDataURL();
   console.log('Canvas stable:', fp1 === fp2); // Should be true
   ```

4. **WebDriver Test:**
   ```javascript
   console.log('navigator.webdriver:', navigator.webdriver); // Should be false
   ```

## 🐛 Troubleshooting

### Build Failures

**Issue:** Build fails with "No space left on device"
```bash
# Solution: Free up space or use external drive
df -h  # Check disk space
```

**Issue:** Patch fails to apply
```bash
# Solution: Check Chromium version compatibility
cd chromium/build/chromium/src
git log --oneline | head -5  # Verify version
```

### Runtime Issues

**Issue:** Chromium crashes on startup
```bash
# Solution: Check dependencies
ldd chromium/chrome | grep "not found"

# Install missing libraries
sudo apt-get install libgtk-3-0 libnss3 libasound2
```

**Issue:** WebGL not working
```bash
# Solution: Enable software rendering
chromium/chrome --use-gl=swiftshader
```

**Issue:** Still detected as automation
```bash
# Verify patches were applied:
chromium/chrome --version  # Should show custom build

# Check for automation variables:
# Open DevTools → Console
console.log(Object.keys(window).filter(k => k.includes('cdc')))  # Should be empty
```

### Docker Build Issues

**Issue:** Docker build fails with permission errors
```bash
# Solution: Fix permissions
sudo chown -R $(whoami):$(whoami) chromium/
```

**Issue:** Docker build runs out of memory
```bash
# Solution: Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory: 16GB+
```

## 📊 Build Statistics

Typical build times and resource usage:

| Hardware | Build Time | Memory Used | Disk Space |
|----------|-----------|-------------|------------|
| 4 cores, 8GB RAM | 5-6 hours | 6-7GB | 35-40GB |
| 8 cores, 16GB RAM | 2-3 hours | 10-12GB | 35-40GB |
| 16 cores, 32GB RAM | 1-2 hours | 15-20GB | 35-40GB |

## 🔐 Security Considerations

1. **Update Regularly:** Keep Chromium version updated for security patches
2. **Test Thoroughly:** Always test in safe environment first
3. **Use Responsibly:** Only use for legitimate testing purposes
4. **Monitor Detection:** Regularly check bot detection sites
5. **Rotate Builds:** Rebuild periodically to avoid signature detection

## 📚 Additional Resources

- [Chromium Build Documentation](https://chromium.googlesource.com/chromium/src/+/main/docs/linux/build_instructions.md)
- [ungoogled-chromium](https://github.com/ungoogled-software/ungoogled-chromium)
- [Fingerprint Detection Methods](../../DETECTION_METHODS_ANALYSIS.md)
- [Main Project Documentation](../../README.md)

## 🤝 Contributing

To add new patches:

1. Create patch file in `patches/`
2. Update `build.sh` to include new patch
3. Document patch in this README
4. Test thoroughly
5. Submit pull request

## 📝 License

This build system is provided as-is for educational and testing purposes.

**Important:** Use only for authorized testing and legitimate purposes. The authors are not responsible for misuse.

## 🆘 Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review build logs in `chromium/build/build.log`
3. Open an issue on GitHub
4. Consult Chromium documentation

---

**Last Updated:** 2025-11-12
**Chromium Version:** 122.0.6261.94
**Build System Version:** 1.0
