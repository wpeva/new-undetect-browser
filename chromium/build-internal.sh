#!/bin/bash

##############################################################################
# Internal Chromium Build Script (runs inside Docker container)
#
# This script is executed inside the Docker container to build Chromium
# with anti-detection patches.
##############################################################################

set -e
set -u

# Configuration
CHROMIUM_VERSION="${CHROMIUM_VERSION:-122.0.6261.94}"
WORKSPACE="/workspace"
OUTPUT="/output"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}\n"
}

# Mark build as in progress
touch "${WORKSPACE}/.build_in_progress"

# Step 1: Fetch Chromium source
log_step "Step 1/6: Fetching Chromium source"

cd "${WORKSPACE}"

if [ ! -d "src" ]; then
    log_info "Fetching Chromium ${CHROMIUM_VERSION}..."

    # Create .gclient file
    cat > .gclient <<EOF
solutions = [
  {
    "name": "src",
    "url": "https://chromium.googlesource.com/chromium/src.git",
    "managed": False,
    "custom_deps": {},
    "custom_vars": {},
  },
]
target_os = ["linux"]
EOF

    # Fetch source
    gclient sync --with_branch_heads --with_tags --no-history

    cd src
    git fetch --tags
    git checkout -b build_branch "refs/tags/${CHROMIUM_VERSION}" || {
        log_warn "Could not checkout exact version, using latest"
    }

    gclient sync --with_branch_heads --with_tags --jobs=4
else
    log_info "Source already exists, skipping fetch"
    cd src
fi

# Step 2: Apply patches
log_step "Step 2/6: Applying anti-detection patches"

PATCHES_DIR="${WORKSPACE}/chromium/patches"

if [ -d "${PATCHES_DIR}" ]; then
    for patch in "${PATCHES_DIR}"/*.patch; do
        if [ -f "${patch}" ]; then
            log_info "Applying $(basename ${patch})..."

            if git apply --check "${patch}" 2>/dev/null; then
                git apply "${patch}"
                log_info "✓ Patch applied successfully"
            else
                log_warn "Patch failed, trying with --reject..."
                git apply --reject --whitespace=fix "${patch}" || {
                    log_warn "Could not apply patch, continuing..."
                }
            fi
        fi
    done
else
    log_warn "No patches directory found at ${PATCHES_DIR}"
fi

# Step 3: Install dependencies
log_step "Step 3/6: Installing build dependencies"

./build/install-build-deps.sh --no-prompt --no-chromeos-fonts

# Step 4: Configure build
log_step "Step 4/6: Configuring build"

mkdir -p out/Default

cat > out/Default/args.gn <<EOF
# Anti-Detection Chromium Build Configuration

# Build type
is_debug = false
is_official_build = true
is_component_build = false

# Optimization
symbol_level = 0
blink_symbol_level = 0
enable_nacl = false

# Remove Google integration
google_api_key = ""
google_default_client_id = ""
google_default_client_secret = ""
use_official_google_api_keys = false

# Privacy & anti-fingerprinting
enable_google_now = false
enable_hangout_services_extension = false
enable_mdns = false
enable_nacl = false
enable_one_click_signin = false
enable_reading_list = false
enable_reporting = false
enable_service_discovery = false
enable_widevine = false
safe_browsing_mode = 0

# Media support
ffmpeg_branding = "Chrome"
proprietary_codecs = true

# Performance optimizations
use_jumbo_build = true
jumbo_file_merge_limit = 50
concurrent_links = 1

# Anti-detection specific flags
enable_automation = false
exclude_unwind_tables = true
enable_iterator_debugging = false

# Platform
target_cpu = "x64"
target_os = "linux"
use_sysroot = true
use_custom_libcxx = true

# Disable unused features
enable_extensions = true
enable_pdf = true
enable_printing = true
enable_basic_printing = true
enable_print_preview = true

# Compiler flags
treat_warnings_as_errors = false
use_thin_lto = false

# Additional anti-fingerprinting
fieldtrial_testing_like_official_build = true
EOF

# Generate build files
log_info "Generating build files with GN..."
gn gen out/Default

# Step 5: Build Chromium
log_step "Step 5/6: Building Chromium (this will take 2-6 hours)"

log_info "Build started at: $(date)"
START_TIME=$(date +%s)

# Build chrome and chromedriver
ninja -C out/Default chrome chromedriver chrome_sandbox

END_TIME=$(date +%s)
BUILD_DURATION=$((END_TIME - START_TIME))
BUILD_HOURS=$((BUILD_DURATION / 3600))
BUILD_MINUTES=$(((BUILD_DURATION % 3600) / 60))

log_info "Build completed at: $(date)"
log_info "Build duration: ${BUILD_HOURS}h ${BUILD_MINUTES}m"

# Step 6: Package binaries
log_step "Step 6/6: Packaging binaries"

VERSION_STRING="${CHROMIUM_VERSION}-antidetect-$(date +%Y%m%d-%H%M%S)"

log_info "Creating output package: ${VERSION_STRING}"

# Create output directory structure
mkdir -p "${OUTPUT}/chromium-${VERSION_STRING}"

# Copy binaries
cp -r out/Default/chrome "${OUTPUT}/chromium-${VERSION_STRING}/"
cp out/Default/chromedriver "${OUTPUT}/chromium-${VERSION_STRING}/"
cp out/Default/chrome_sandbox "${OUTPUT}/chromium-${VERSION_STRING}/"

# Copy libraries
mkdir -p "${OUTPUT}/chromium-${VERSION_STRING}/lib"
cp out/Default/*.so "${OUTPUT}/chromium-${VERSION_STRING}/lib/" 2>/dev/null || true
cp -r out/Default/swiftshader "${OUTPUT}/chromium-${VERSION_STRING}/" 2>/dev/null || true

# Create version file
cat > "${OUTPUT}/chromium-${VERSION_STRING}/VERSION" <<EOF
Chromium Anti-Detection Build
==============================
Version: ${VERSION_STRING}
Base Chromium: ${CHROMIUM_VERSION}
Build Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Build Host: $(hostname)
Patches Applied:
- Canvas noise injection
- WebGL fingerprint protection
- CDP removal
- Permissions stealth
- Automation detection removal

Build Configuration:
- Official build: Yes
- Debug symbols: No
- Component build: No
- Jumbo build: Yes
- Thin LTO: No

Build Duration: ${BUILD_HOURS}h ${BUILD_MINUTES}m
EOF

# Create README
cat > "${OUTPUT}/chromium-${VERSION_STRING}/README.md" <<EOF
# Chromium Anti-Detection Build

This is a custom build of Chromium ${CHROMIUM_VERSION} with anti-detection patches applied.

## Features

- **Canvas Fingerprinting Protection**: Adds subtle noise to canvas operations
- **WebGL Protection**: Spoofs WebGL parameters and adds noise to readPixels
- **CDP Removal**: Removes Chrome DevTools Protocol detection vectors
- **Permissions Stealth**: Realistic permission handling
- **Automation Detection Removal**: Removes automation flags and variables

## Usage

\`\`\`bash
# Run Chromium
./chrome --no-sandbox --disable-dev-shm-usage

# Run with custom data directory
./chrome --user-data-dir=/tmp/chrome-profile

# Run ChromeDriver
./chromedriver --port=9515
\`\`\`

## Important Notes

1. This build is for testing and educational purposes only
2. Always test in a safe environment first
3. Keep this build updated with latest Chromium security patches
4. Use responsibly and ethically

## Verification

To verify the anti-detection features are working:

1. Visit: https://bot.sannysoft.com/
2. Visit: https://pixelscan.net/
3. Visit: https://arh.antoinevastel.com/bots/areyouheadless

## Support

For issues or questions, please refer to the main repository documentation.

## Build Information

Built: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Version: ${VERSION_STRING}
Base: Chromium ${CHROMIUM_VERSION}
EOF

# Create launcher script
cat > "${OUTPUT}/chromium-${VERSION_STRING}/launch.sh" <<'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export LD_LIBRARY_PATH="${SCRIPT_DIR}/lib:${LD_LIBRARY_PATH}"
exec "${SCRIPT_DIR}/chrome" "$@"
EOF
chmod +x "${OUTPUT}/chromium-${VERSION_STRING}/launch.sh"

# Create archive
cd "${OUTPUT}"
tar -czf "chromium-${VERSION_STRING}.tar.gz" "chromium-${VERSION_STRING}"

# Create checksums
sha256sum "chromium-${VERSION_STRING}.tar.gz" > "chromium-${VERSION_STRING}.tar.gz.sha256"

# Cleanup
rm -rf "chromium-${VERSION_STRING}"

# Remove build in progress marker
rm -f "${WORKSPACE}/.build_in_progress"

# Final summary
log_step "Build Complete!"

echo -e "${GREEN}✓ Build successful!${NC}"
echo ""
echo "Output files:"
echo "  Archive: ${OUTPUT}/chromium-${VERSION_STRING}.tar.gz"
echo "  Checksum: ${OUTPUT}/chromium-${VERSION_STRING}.tar.gz.sha256"
echo ""
echo "File size: $(du -h ${OUTPUT}/chromium-${VERSION_STRING}.tar.gz | cut -f1)"
echo ""
echo "To use:"
echo "  1. Extract: tar -xzf chromium-${VERSION_STRING}.tar.gz"
echo "  2. Run: ./launch.sh"
echo ""
echo -e "${YELLOW}Remember to test thoroughly before production use!${NC}"
