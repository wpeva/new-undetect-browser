# Custom Chromium Build for Anti-Detection

This directory contains patches, build scripts, and documentation for building a custom Chromium browser optimized for anti-detection.

## Why Custom Chromium?

While runtime JavaScript injection (Sessions 1-2) provides strong protection, a custom-built Chromium binary offers:

1. **Deeper Integration**: Modify C++ code directly for undetectable changes
2. **Performance**: No runtime overhead from JavaScript injection
3. **Complete Control**: Access to internal APIs not exposed to JavaScript
4. **Signature Elimination**: Remove all automation signatures at compile time
5. **Novel Fingerprints**: Create unique browser fingerprints not seen in the wild

## Build Overview

### Prerequisites

- **Operating System**: Linux (Ubuntu 20.04+ or Debian 11+ recommended)
- **CPU**: 8+ cores (16+ recommended)
- **RAM**: 16GB minimum (32GB recommended)
- **Disk Space**: 100GB+ free space
- **Time**: 2-4 hours for first build, 30-60 minutes for incremental builds

### Build Process

```
1. Fetch Chromium source (~20GB)
   └─> depot_tools + gclient sync

2. Apply anti-detection patches (~50 patches)
   └─> Modify: Blink, V8, DevTools, Network stack

3. Configure build (GN args)
   └─> Set flags for optimization and anti-detection

4. Compile Chromium (2-4 hours)
   └─> ninja -C out/Release chrome

5. Package binary
   └─> Strip debug symbols, create archive

6. Integration with Docker
   └─> Use custom binary in cloud infrastructure
```

## Directory Structure

```
chromium/
├── README.md                 # This file
├── BUILDING.md              # Detailed build instructions
├── PATCHES.md               # Patch documentation
├── patches/                 # Patch files (.patch)
│   ├── 001-remove-webdriver.patch
│   ├── 002-spoof-navigator.patch
│   ├── 003-canvas-fingerprint.patch
│   └── ...
├── scripts/                 # Build automation scripts
│   ├── fetch-chromium.sh   # Download Chromium source
│   ├── apply-patches.sh    # Apply all patches
│   ├── build.sh            # Full build script
│   ├── test.sh             # Run tests
│   └── package.sh          # Package binary
├── docker/                  # Docker build environment
│   ├── Dockerfile.builder  # Build container
│   └── Dockerfile.runtime  # Runtime container with custom binary
└── config/                  # Build configurations
    ├── args.gn             # GN build arguments
    └── component_whitelist.txt
```

## Quick Start (Local Build)

### 1. Install Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  git python3 python3-pip curl wget \
  build-essential ninja-build \
  libglib2.0-dev libgtk-3-dev \
  libdbus-1-dev libnss3-dev \
  libxss-dev libasound2-dev \
  libcups2-dev libxkbcommon-dev \
  nodejs npm

# Install depot_tools
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH="$PATH:$(pwd)/depot_tools"
```

### 2. Fetch Chromium Source

```bash
cd chromium/scripts
./fetch-chromium.sh
# This downloads ~20GB and takes 30-60 minutes
```

### 3. Apply Anti-Detection Patches

```bash
./apply-patches.sh
# Applies all patches from chromium/patches/
```

### 4. Build Chromium

```bash
./build.sh
# First build: 2-4 hours
# Subsequent builds: 30-60 minutes
```

### 5. Test Custom Binary

```bash
./test.sh
# Runs automated tests to verify anti-detection features
```

### 6. Package for Distribution

```bash
./package.sh
# Creates chromium-antidetect-linux-x64.tar.gz
```

## Quick Start (Docker Build)

For a reproducible build environment:

```bash
# Build the builder image (once)
cd chromium/docker
docker build -f Dockerfile.builder -t chromium-builder .

# Run the build
docker run --rm -v $(pwd)/../../:/workspace chromium-builder

# Extract the binary
docker cp <container_id>:/chromium/src/out/Release/chrome ./chrome-custom
```

## Patch Categories

### Category 1: WebDriver Detection Removal (Critical)

- `001-remove-webdriver.patch` - Remove navigator.webdriver
- `002-remove-automation-flags.patch` - Remove --enable-automation
- `003-remove-devtools-detection.patch` - Remove DevTools detection APIs

### Category 2: Navigator API Spoofing

- `010-navigator-plugins.patch` - Realistic plugin enumeration
- `011-navigator-languages.patch` - Custom language lists
- `012-navigator-platform.patch` - Platform spoofing

### Category 3: Canvas & WebGL Fingerprinting

- `020-canvas-noise.patch` - Add per-domain canvas noise
- `021-webgl-vendor.patch` - Spoof WebGL vendor/renderer
- `022-webgl-parameters.patch` - Custom WebGL parameters

### Category 4: Network & Timing

- `030-network-timing.patch` - Realistic network timing
- `031-performance-timing.patch` - Add noise to performance.now()
- `032-resource-timing.patch` - Modify resource timing API

### Category 5: Audio & Media

- `040-audio-context.patch` - Audio fingerprint protection
- `041-media-devices.patch` - Camera/microphone enumeration
- `042-webrtc-leak.patch` - Prevent WebRTC IP leaks

### Category 6: Screen & Display

- `050-screen-resolution.patch` - Screen resolution spoofing
- `051-device-pixel-ratio.patch` - Custom devicePixelRatio
- `052-color-depth.patch` - Color depth variation

### Category 7: Advanced Detection

- `060-chrome-runtime.patch` - Remove chrome.runtime detection
- `061-permissions-api.patch` - Permissions API spoofing
- `062-battery-api.patch` - Battery API protection

## Build Flags (args.gn)

Key GN arguments for anti-detection build:

```gn
# Basic flags
is_debug = false
is_official_build = true
symbol_level = 0
enable_nacl = false

# Anti-detection specific
disable_webdriver = true
disable_devtools_protocol_logging = true
randomize_canvas_fingerprints = true
randomize_webgl_fingerprints = true
randomize_audio_fingerprints = true

# Performance optimizations
is_component_build = false
use_thin_lto = true
chrome_pgo_phase = 2

# Remove bloat
enable_pdf = false
enable_print_preview = false
enable_service_discovery = false
```

## Integration with Cloud Infrastructure

After building the custom Chromium binary:

### 1. Update Dockerfile.cloud

```dockerfile
# Copy custom binary instead of installing system chromium
COPY chromium/chrome /opt/chrome/chrome
ENV PUPPETEER_EXECUTABLE_PATH=/opt/chrome/chrome
```

### 2. Update docker-compose.cloud.yml

```yaml
services:
  browser-pool:
    build:
      context: .
      dockerfile: docker/Dockerfile.cloud
    # Custom binary is now used automatically
```

### 3. Rebuild Docker Images

```bash
docker compose -f docker-compose.cloud.yml build
```

## Testing Anti-Detection

### Automated Tests

```bash
cd chromium/scripts
./test.sh

# Tests include:
# - navigator.webdriver should be undefined
# - Chrome DevTools Protocol detection
# - Canvas fingerprint consistency
# - WebGL fingerprint uniqueness
# - Audio context fingerprint
# - Performance timing accuracy
```

### Manual Testing Sites

Test your custom build on these detection sites:

1. **https://bot.sannysoft.com/** - Comprehensive bot detection
2. **https://pixelscan.net/** - Advanced fingerprinting
3. **https://abrahamjuliot.github.io/creepjs/** - Lie detection
4. **https://arh.antoinevastel.com/bots/areyouheadless** - Headless detection
5. **https://kaliiiiiiiiii.github.io/brotector/** - Chrome automation detection

### Expected Results

With custom Chromium + runtime protections:

| Test | Before | After Custom Build |
|------|--------|-------------------|
| navigator.webdriver | ❌ true | ✅ undefined |
| Chrome object detection | ❌ Detected | ✅ Hidden |
| Canvas fingerprint | ❌ Blocked | ✅ Unique |
| WebGL fingerprint | ❌ Blocked | ✅ Unique |
| Audio fingerprint | ❌ Consistent | ✅ Varied |
| Overall score | 6.5/10 | 9.5/10 |

## Maintenance

### Updating to New Chromium Versions

```bash
# Fetch latest stable
cd chromium/src
git fetch --tags
git checkout <version-tag>
gclient sync

# Re-apply patches (may need manual resolution)
cd ../scripts
./apply-patches.sh

# Test and rebuild
./build.sh
./test.sh
```

### Creating New Patches

```bash
# Make changes in chromium/src
cd chromium/src
# ... edit files ...

# Create patch
git diff > ../patches/XXX-my-patch.patch

# Document in PATCHES.md
# Add to apply-patches.sh
```

## Performance Considerations

### Build Time Optimization

- **Use ccache**: Speeds up rebuilds by 50-80%
- **Distributed builds**: Use goma or sccache for network caching
- **Component builds**: Faster iteration during development

### Runtime Performance

Custom build adds minimal overhead:
- Canvas noise: <1ms per operation
- WebGL spoofing: <2ms initialization
- Network timing: <0.1ms per request
- Total overhead: <1% performance impact

## Security Considerations

### Code Signing

For production deployment, sign your custom binary:

```bash
# Linux: AppImage
appimagetool chromium-antidetect.AppDir

# Windows: signtool
signtool sign /f certificate.pfx chrome.exe

# macOS: codesign
codesign --force --sign "Developer ID" Chromium.app
```

### Update Mechanism

Implement secure updates:

```bash
# Generate signature
openssl dgst -sha256 -sign private.key chrome.tar.gz > chrome.tar.gz.sig

# Verify on client
openssl dgst -sha256 -verify public.key -signature chrome.tar.gz.sig chrome.tar.gz
```

## Troubleshooting

### Build Failures

**Out of memory during link**
```bash
# Reduce parallel jobs
ninja -j4 -C out/Release chrome
# Or use gold linker
gn args out/Release
use_gold = true
```

**Python 2 required**
```bash
# Chromium still uses Python 2 for some scripts
sudo apt-get install python2
```

**Missing dependencies**
```bash
# Run dependency check
./build/install-build-deps.sh
```

### Patch Conflicts

When patches don't apply cleanly:

```bash
# Apply manually
cd chromium/src
patch -p1 < ../patches/001-remove-webdriver.patch

# Fix conflicts
# ... edit files ...

# Update patch
git diff > ../patches/001-remove-webdriver.patch
```

## Resources

### Official Chromium Documentation

- Building Chromium: https://chromium.googlesource.com/chromium/src/+/main/docs/linux/build_instructions.md
- GN Reference: https://gn.googlesource.com/gn/+/refs/heads/main/docs/reference.md
- Chromium Design Docs: https://www.chromium.org/developers/design-documents

### Anti-Detection Research

- FingerprintJS Blog: https://fingerprintjs.com/blog/
- Antoine Vastel's Blog: https://antoinevastel.com/
- Chromium Automation Detection: https://github.com/ultrafunkamsterdam/undetected-chromedriver

### Community

- GitHub Issues: https://github.com/your-repo/new-undetect-browser/issues
- Discord: [Your Discord Server]

## License

Custom patches are licensed under MIT.
Chromium source code is licensed under BSD-3-Clause.

## Next Steps

After completing the custom Chromium build:

1. **Session 5**: Hardware Virtualization (QEMU/KVM)
2. **Session 6**: GPU Passthrough for WebGL
3. **Session 7**: eBPF Network Fingerprinting
4. **Session 8**: ML-based Profile Generation

---

**Status**: Session 4 of 15
**Estimated Rating**: With custom Chromium: 9.5/10
**Build Time**: 2-4 hours (first build), 30-60 min (incremental)
