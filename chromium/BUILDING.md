# Building Custom Chromium: Step-by-Step Guide

This guide provides detailed instructions for building a custom Chromium binary with anti-detection patches.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Fetching Chromium Source](#fetching-chromium-source)
4. [Applying Patches](#applying-patches)
5. [Configuring the Build](#configuring-the-build)
6. [Building](#building)
7. [Testing](#testing)
8. [Packaging](#packaging)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 16+ cores |
| RAM | 16 GB | 32+ GB |
| Disk | 100 GB | 200+ GB (SSD) |
| Network | 10 Mbps | 100+ Mbps |

### Software Requirements

**Operating System:**
- Ubuntu 20.04 LTS or later
- Debian 11 or later
- Fedora 35 or later
- Other Linux distributions (may require manual dependency installation)

**Note:** While macOS and Windows builds are possible, this guide focuses on Linux for optimal results.

## Environment Setup

### Step 1: Install System Dependencies

```bash
# Update package list
sudo apt-get update

# Install required packages
sudo apt-get install -y \
  git python3 python3-pip curl wget unzip \
  build-essential ninja-build pkg-config \
  libglib2.0-dev libgtk-3-dev libdbus-1-dev \
  libnss3-dev libxss-dev libasound2-dev \
  libcups2-dev libxkbcommon-dev libxrandr-dev \
  libpango1.0-dev libatk1.0-dev libatk-bridge2.0-dev \
  libdrm-dev libgbm-dev \
  nodejs npm

# Install additional dependencies for Chromium
sudo apt-get install -y \
  libnspr4-dev libnss3-dev libexpat1-dev \
  libffi-dev libgdk-pixbuf2.0-dev \
  libgtk2.0-dev libxslt1-dev libxml2-dev \
  libpulse-dev libxt-dev libxext-dev
```

### Step 2: Install depot_tools

`depot_tools` is Google's build toolchain manager.

```bash
# Clone depot_tools
cd ~
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git

# Add to PATH (add to ~/.bashrc for persistence)
export PATH="$HOME/depot_tools:$PATH"

# Verify installation
which gclient
# Should output: /home/user/depot_tools/gclient
```

**Make it permanent:**

```bash
echo 'export PATH="$HOME/depot_tools:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Step 3: Configure Git

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.autocrlf false
git config --global core.filemode false
git config --global color.ui true
```

### Step 4: Install Build Accelerators (Optional but Recommended)

#### ccache (Compiler Cache)

```bash
sudo apt-get install -y ccache

# Configure
export PATH="/usr/lib/ccache:$PATH"
export CCACHE_CPP2=yes
export CCACHE_SLOPPINESS=time_macros
export CCACHE_MAXSIZE=50G

# Add to ~/.bashrc
echo 'export PATH="/usr/lib/ccache:$PATH"' >> ~/.bashrc
echo 'export CCACHE_CPP2=yes' >> ~/.bashrc
echo 'export CCACHE_SLOPPINESS=time_macros' >> ~/.bashrc
echo 'export CCACHE_MAXSIZE=50G' >> ~/.bashrc
```

## Fetching Chromium Source

### Step 1: Create Working Directory

```bash
# Create directory for Chromium source
mkdir -p ~/chromium
cd ~/chromium
```

### Step 2: Fetch Source with gclient

**Option A: Automated (Recommended)**

```bash
# From your project directory
cd /path/to/new-undetect-browser/chromium/scripts
./fetch-chromium.sh
```

**Option B: Manual**

```bash
cd ~/chromium

# Create .gclient configuration
cat > .gclient << 'EOF'
solutions = [
  {
    "name": "src",
    "url": "https://chromium.googlesource.com/chromium/src.git",
    "managed": False,
    "custom_deps": {},
    "custom_vars": {},
  },
]
target_os = ['linux']
EOF

# Fetch source (this takes 30-60 minutes)
gclient sync --with_branch_heads --with_tags

# Checkout specific version (stable)
cd src
git checkout -b antidetect-build 120.0.6099.109
# Replace with latest stable from: https://chromiumdash.appspot.com/releases

# Sync dependencies for this version
gclient sync -D
```

### Step 3: Verify Source

```bash
cd ~/chromium/src

# Check version
cat chrome/VERSION
# Output example:
# MAJOR=120
# MINOR=0
# BUILD=6099
# PATCH=109

# Verify directory structure
ls -la
# Should see: chrome/, content/, third_party/, etc.
```

**Expected directories:**
- `chrome/` - Chrome-specific code
- `content/` - Content/Blink rendering engine
- `v8/` - JavaScript engine
- `third_party/` - Third-party dependencies
- `out/` - Build output (created during build)

## Applying Patches

### Step 1: Copy Patches to Chromium Directory

```bash
# From project directory
cd /path/to/new-undetect-browser
cp -r chromium/patches ~/chromium/
```

### Step 2: Apply Patches Automatically

```bash
cd /path/to/new-undetect-browser/chromium/scripts
./apply-patches.sh
```

### Step 3: Verify Patches Applied

```bash
cd ~/chromium/src
git status

# Should show modified files
# Modified files indicate patches were applied successfully
```

### Step 4: Manual Patch Application (if needed)

If automated patching fails:

```bash
cd ~/chromium/src

# Apply single patch
patch -p1 < ~/chromium/patches/001-remove-webdriver.patch

# Check for conflicts
git status

# If conflicts occur, edit files manually:
# - Look for conflict markers: <<<<<<<, =======, >>>>>>>
# - Resolve conflicts
# - Save files

# Test patch applies cleanly
patch -p1 --dry-run < ~/chromium/patches/001-remove-webdriver.patch
```

## Configuring the Build

### Step 1: Run Configuration Script

```bash
# Install additional build dependencies
cd ~/chromium/src
./build/install-build-deps.sh --no-prompt
```

### Step 2: Create Build Directory

```bash
cd ~/chromium/src
mkdir -p out/Release
```

### Step 3: Configure GN Arguments

**Option A: Use Predefined Configuration**

```bash
# Copy configuration from project
cp /path/to/new-undetect-browser/chromium/config/args.gn ~/chromium/src/out/Release/
```

**Option B: Interactive Configuration**

```bash
cd ~/chromium/src
gn args out/Release
```

This opens an editor. Add the following configuration:

```gn
# Build type
is_debug = false
is_official_build = true
is_component_build = false

# Optimization
symbol_level = 0
blink_symbol_level = 0
enable_nacl = false
use_thin_lto = true

# Anti-detection flags (custom)
# Note: These require our patches
proprietary_codecs = true
ffmpeg_branding = "Chrome"

# Disable unused features
enable_pdf = false
enable_print_preview = false
enable_service_discovery = false
enable_hangout_services_extension = false
enable_widevine = false
enable_reading_list = false
enable_background_contents = false

# Performance optimizations
use_jumbo_build = true
concurrent_links = 2
use_gold = true

# Remove branding
chrome_pgo_phase = 0
is_chrome_branded = false

# Target architecture
target_cpu = "x64"

# Additional flags
enable_dsyms = false
fatal_linker_warnings = false
treat_warnings_as_errors = false
```

### Step 4: Verify Configuration

```bash
cd ~/chromium/src
gn gen out/Release

# Check for errors
# If successful, you'll see: "Done. Made X targets from Y files in Zms"

# View final args
gn args out/Release --list
```

## Building

### Step 1: Start Build

**Full Build:**

```bash
cd ~/chromium/src

# Build Chrome browser (2-4 hours first time)
autoninja -C out/Release chrome

# Or use ninja directly with job control
ninja -j$(nproc) -C out/Release chrome
```

**Tip:** Adjust `-j` value based on available RAM:
- 16GB RAM: `-j4`
- 32GB RAM: `-j8`
- 64GB RAM: `-j16`

### Step 2: Monitor Build Progress

```bash
# In another terminal
watch -n 5 'ps aux | grep ninja'

# Or check build log
tail -f ~/chromium/src/out/Release/build.log
```

### Step 3: Build Additional Targets (Optional)

```bash
# Build chromedriver (for Puppeteer)
autoninja -C out/Release chromedriver

# Build all tests
autoninja -C out/Release chrome/test:unit_tests
```

### Step 4: Verify Build Success

```bash
cd ~/chromium/src/out/Release

# Check binary exists
ls -lh chrome
# Should be ~200-300 MB

# Check it's executable
file chrome
# Output: chrome: ELF 64-bit LSB executable...

# Quick test (should open browser)
./chrome --version
# Output: Chromium 120.0.6099.109 (or your version)
```

## Testing

### Step 1: Basic Functionality Test

```bash
cd ~/chromium/src/out/Release

# Test with visible GUI
./chrome --user-data-dir=/tmp/test-profile

# Test headless mode
./chrome --headless --disable-gpu --dump-dom https://www.google.com
```

### Step 2: Anti-Detection Tests

```bash
# From project directory
cd /path/to/new-undetect-browser/chromium/scripts
./test.sh
```

This script tests:
1. navigator.webdriver is undefined
2. Chrome automation detection
3. Canvas fingerprint functionality
4. WebGL spoofing
5. Audio context protection

### Step 3: Run Chromium Unit Tests

```bash
cd ~/chromium/src

# Build tests
autoninja -C out/Release chrome/test:unit_tests

# Run tests
out/Release/unit_tests

# Run specific test
out/Release/unit_tests --gtest_filter=NavigatorTest.*
```

### Step 4: Manual Detection Site Testing

```bash
# Open detection sites
./chrome \
  --user-data-dir=/tmp/test \
  https://bot.sannysoft.com/

# Check results:
# - navigator.webdriver: Should be undefined ✓
# - Chrome object: Should not be detected ✓
# - Permissions: Should behave like normal Chrome ✓
```

## Packaging

### Step 1: Strip Debug Symbols

```bash
cd ~/chromium/src/out/Release

# Strip binary (reduces size by 50-70%)
strip chrome chromedriver

# Verify size reduction
ls -lh chrome
# Should be ~100-150 MB after stripping
```

### Step 2: Collect Required Files

```bash
cd ~/chromium/src/out/Release

# Create package directory
mkdir -p ~/chromium-package

# Copy essential files
cp chrome ~/chromium-package/
cp chromedriver ~/chromium-package/
cp -r locales ~/chromium-package/
cp -r resources ~/chromium-package/
cp *.pak ~/chromium-package/
cp *.bin ~/chromium-package/
cp icudtl.dat ~/chromium-package/
cp libEGL.so libGLESv2.so ~/chromium-package/
cp v8_context_snapshot.bin ~/chromium-package/
```

### Step 3: Create Archive

```bash
cd ~
tar -czf chromium-antidetect-linux-x64-$(date +%Y%m%d).tar.gz chromium-package/

# Verify archive
tar -tzf chromium-antidetect-linux-x64-*.tar.gz | head -20

# Check size
ls -lh chromium-antidetect-linux-x64-*.tar.gz
# Should be ~60-80 MB compressed
```

### Step 4: Create Checksums

```bash
# SHA256
sha256sum chromium-antidetect-linux-x64-*.tar.gz > chromium-antidetect.sha256

# MD5 (for compatibility)
md5sum chromium-antidetect-linux-x64-*.tar.gz > chromium-antidetect.md5
```

### Step 5: Sign Binary (Production)

```bash
# Generate signing key (once)
openssl genrsa -out signing-key.pem 2048
openssl rsa -in signing-key.pem -pubout -out signing-key-pub.pem

# Sign archive
openssl dgst -sha256 -sign signing-key.pem \
  -out chromium-antidetect.sig \
  chromium-antidetect-linux-x64-*.tar.gz

# Verify signature
openssl dgst -sha256 -verify signing-key-pub.pem \
  -signature chromium-antidetect.sig \
  chromium-antidetect-linux-x64-*.tar.gz
```

## Troubleshooting

### Build Failures

#### Out of Memory During Link

**Error:** `c++: fatal error: Killed signal terminated program cc1plus`

**Solution:**
```bash
# Reduce parallel jobs
ninja -j2 -C out/Release chrome

# Or use gold linker (uses less memory)
gn args out/Release
# Add: use_gold = true

# Or enable swap
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Missing Python 2

**Error:** `python: command not found`

**Solution:**
```bash
# Install Python 2
sudo apt-get install -y python2

# Create symlink
sudo ln -s /usr/bin/python2 /usr/bin/python
```

#### Patch Conflicts

**Error:** `Hunk #1 FAILED at line 42`

**Solution:**
```bash
# Apply patch manually
cd ~/chromium/src
patch -p1 < ~/chromium/patches/001-remove-webdriver.patch

# View conflicts
git status

# Edit conflicting files manually
# Look for <<<<<<< markers

# After resolving, regenerate patch
git diff > ~/chromium/patches/001-remove-webdriver.patch.new
```

### Runtime Issues

#### Library Not Found

**Error:** `error while loading shared libraries: libXXX.so.X`

**Solution:**
```bash
# Find missing library
ldd ~/chromium/src/out/Release/chrome | grep "not found"

# Install missing package
sudo apt-get install lib<name>-dev
```

#### Chrome Won't Start

**Error:** `Segmentation fault`

**Solution:**
```bash
# Run with debugging
./chrome --enable-logging --v=1

# Check logs
cat ~/.config/chromium/chrome_debug.log

# Try with clean profile
./chrome --user-data-dir=/tmp/clean-profile
```

## Performance Tips

### Faster Builds

1. **Use ccache** (70% faster rebuilds)
2. **Use jumbo builds** (`use_jumbo_build = true`)
3. **Reduce debug info** (`symbol_level = 0`)
4. **Disable tests in build** (build chrome target only)
5. **Use SSD** (3-5x faster than HDD)

### Incremental Builds

After making changes:

```bash
# Only rebuild changed targets
autoninja -C out/Release chrome

# Typical incremental build: 5-15 minutes
```

## Next Steps

1. Copy binary to Docker image (Session 3 integration)
2. Deploy to cloud infrastructure
3. Run comprehensive detection tests
4. Monitor performance metrics

## Resources

- Chromium Build Docs: https://chromium.googlesource.com/chromium/src/+/main/docs/linux/build_instructions.md
- GN Reference: https://gn.googlesource.com/gn/+/refs/heads/main/docs/reference.md
- Build Performance: https://chromium.googlesource.com/chromium/src/+/main/docs/speed.md

---

**Estimated Build Times:**
- First build: 2-4 hours (16 cores, 32GB RAM, SSD)
- Incremental build: 5-30 minutes
- Full rebuild: 1-2 hours

**Disk Space Usage:**
- Source code: ~20GB
- Build artifacts: ~30GB
- Final binary (stripped): ~100MB
- Total required: ~100GB (including workspace)
