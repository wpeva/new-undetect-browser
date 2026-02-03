#!/bin/bash

##############################################################################
# Chromium Anti-Detection Build Script
#
# This script automates the process of:
# 1. Downloading ungoogled-chromium source
# 2. Applying anti-detection patches
# 3. Building Chromium with stealth features
#
# Requirements:
# - Docker (for containerized builds)
# - ~40GB disk space
# - 8GB+ RAM recommended
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="${SCRIPT_DIR}/build"
CHROMIUM_VERSION="${CHROMIUM_VERSION:-122.0.6261.94}"
UNGOOGLED_VERSION="${UNGOOGLED_VERSION:-122.0.6261.94-1}"
PATCHES_DIR="${SCRIPT_DIR}/patches"
OUTPUT_DIR="${SCRIPT_DIR}/output"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi

    # Check disk space (need at least 40GB)
    AVAILABLE_SPACE=$(df -BG "${SCRIPT_DIR}" | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 40 ]; then
        log_warn "Low disk space: ${AVAILABLE_SPACE}GB available. Recommend at least 40GB."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    log_info "Prerequisites check passed!"
}

# Setup build directory
setup_build_dir() {
    log_info "Setting up build directory..."

    mkdir -p "${WORK_DIR}"
    mkdir -p "${OUTPUT_DIR}"

    cd "${WORK_DIR}"
}

# Download ungoogled-chromium
download_ungoogled_chromium() {
    log_info "Downloading ungoogled-chromium ${UNGOOGLED_VERSION}..."

    if [ -d "${WORK_DIR}/ungoogled-chromium" ]; then
        log_warn "ungoogled-chromium already exists. Skipping download."
        return
    fi

    # Clone ungoogled-chromium repository
    git clone --depth 1 --branch "${UNGOOGLED_VERSION}" \
        https://github.com/ungoogled-software/ungoogled-chromium.git \
        "${WORK_DIR}/ungoogled-chromium" || {
        log_warn "Failed to clone specific version, cloning main branch..."
        git clone --depth 1 \
            https://github.com/ungoogled-software/ungoogled-chromium.git \
            "${WORK_DIR}/ungoogled-chromium"
    }

    log_info "ungoogled-chromium downloaded successfully!"
}

# Download Chromium source
download_chromium_source() {
    log_info "Downloading Chromium source..."

    if [ -d "${WORK_DIR}/chromium" ]; then
        log_warn "Chromium source already exists. Skipping download."
        return
    fi

    cd "${WORK_DIR}"

    # Use depot_tools to download Chromium
    if [ ! -d "depot_tools" ]; then
        log_info "Downloading depot_tools..."
        git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
    fi

    export PATH="${WORK_DIR}/depot_tools:$PATH"

    # Fetch Chromium source
    log_info "Fetching Chromium source (this may take a while)..."
    mkdir -p chromium
    cd chromium

    fetch --nohooks chromium

    cd src
    git checkout -b build_branch "refs/tags/${CHROMIUM_VERSION}"
    gclient sync --with_branch_heads --with_tags --jobs=4

    log_info "Chromium source downloaded successfully!"
}

# Apply anti-detection patches
apply_patches() {
    log_info "Applying anti-detection patches..."

    cd "${WORK_DIR}/chromium/src"

    # List of patches to apply (ORDER MATTERS!)
    # The FingerprintSessionManager must be applied first as other patches depend on it
    PATCHES=(
        # Phase 1: Core integration layer
        "000-fingerprint-session-manager.patch"  # MUST BE FIRST - provides unified config

        # Phase 2: Unified patches that use FingerprintSessionManager
        "021-canvas-unified.patch"     # Canvas with unified config
        "022-navigator-unified.patch"  # Navigator properties with unified config
        "023-webgl-unified.patch"      # WebGL with unified config
        "024-audio-unified.patch"      # Audio with unified config
        "025-screen-unified.patch"     # Screen with unified config

        # Phase 3: Automation removal (doesn't need FingerprintSessionManager)
        "001-remove-webdriver.patch"
        "002-remove-automation-flags.patch"
        "cdp-removal.patch"
        "permissions-stealth.patch"
        "automation-removal.patch"
    )

    for patch in "${PATCHES[@]}"; do
        patch_file="${PATCHES_DIR}/${patch}"

        if [ ! -f "${patch_file}" ]; then
            log_warn "Patch file not found: ${patch_file}"
            continue
        fi

        log_info "Applying patch: ${patch}"

        # Try to apply patch
        if git apply --check "${patch_file}" 2>/dev/null; then
            git apply "${patch_file}"
            log_info "Patch applied successfully: ${patch}"
        else
            log_warn "Patch failed to apply cleanly: ${patch}"
            log_warn "Attempting to apply with --reject option..."
            git apply --reject --whitespace=fix "${patch_file}" || {
                log_error "Failed to apply patch: ${patch}"
                log_warn "Continuing with remaining patches..."
            }
        fi
    done

    log_info "All patches processed!"
}

# Configure build
configure_build() {
    log_info "Configuring Chromium build..."

    cd "${WORK_DIR}/chromium/src"

    # Create args.gn file with our build configuration
    cat > out/Default/args.gn <<EOF
# Chromium Anti-Detection Build Configuration

# Basic settings
is_debug = false
is_official_build = true
symbol_level = 0
enable_nacl = false

# Branding
chrome_pgo_phase = 0
is_component_build = false

# Disable Google features
enable_google_now = false
enable_hangout_services_extension = false
enable_one_click_signin = false
enable_reading_list = false
enable_service_discovery = false
google_api_key = ""
google_default_client_id = ""
google_default_client_secret = ""

# Privacy features
enable_mdns = false
enable_nacl = false
enable_reporting = false
enable_widevine = false
safe_browsing_mode = 0
use_official_google_api_keys = false

# Performance
ffmpeg_branding = "Chrome"
proprietary_codecs = true
use_jumbo_build = true
jumbo_file_merge_limit = 50

# Anti-detection specific
enable_automation = false
exclude_unwind_tables = true
enable_iterator_debugging = false

# Platform-specific
use_sysroot = true
use_custom_libcxx = true
treat_warnings_as_errors = false
EOF

    log_info "Build configured successfully!"
}

# Build Chromium
build_chromium() {
    log_info "Building Chromium (this will take several hours)..."

    cd "${WORK_DIR}/chromium/src"

    # Generate build files
    gn gen out/Default

    # Build Chromium
    ninja -C out/Default chrome chromedriver

    log_info "Chromium built successfully!"
}

# Package binaries
package_binaries() {
    log_info "Packaging binaries..."

    cd "${WORK_DIR}/chromium/src"

    # Copy binaries to output directory
    cp -r out/Default/chrome "${OUTPUT_DIR}/"
    cp out/Default/chromedriver "${OUTPUT_DIR}/"

    # Create version file
    echo "${CHROMIUM_VERSION}-antidetect-$(date +%Y%m%d)" > "${OUTPUT_DIR}/VERSION"

    # Create archive
    cd "${OUTPUT_DIR}"
    tar -czf "chromium-antidetect-${CHROMIUM_VERSION}.tar.gz" chrome chromedriver VERSION

    log_info "Binaries packaged successfully!"
    log_info "Output: ${OUTPUT_DIR}/chromium-antidetect-${CHROMIUM_VERSION}.tar.gz"
}

# Build using Docker
build_with_docker() {
    log_info "Building with Docker..."

    cd "${SCRIPT_DIR}"

    # Build Docker image
    docker build -t chromium-antidetect-builder:latest -f docker/Dockerfile.build .

    # Run build in container
    docker run --rm \
        -v "${SCRIPT_DIR}:/workspace" \
        -v "${OUTPUT_DIR}:/output" \
        -e "CHROMIUM_VERSION=${CHROMIUM_VERSION}" \
        chromium-antidetect-builder:latest

    log_info "Docker build completed!"
}

# Download pre-built Chromium (faster alternative)
download_prebuilt() {
    log_info "Downloading pre-built ungoogled-chromium..."

    # Detect platform
    PLATFORM="$(uname -s)"
    ARCH="$(uname -m)"

    case "${PLATFORM}" in
        Linux)
            if [ "${ARCH}" = "x86_64" ]; then
                DOWNLOAD_URL="https://github.com/ungoogled-software/ungoogled-chromium-binaries/releases/download/${UNGOOGLED_VERSION}/ungoogled-chromium_${UNGOOGLED_VERSION}_linux.tar.xz"
            else
                log_error "Unsupported architecture: ${ARCH}"
                exit 1
            fi
            ;;
        Darwin)
            DOWNLOAD_URL="https://github.com/ungoogled-software/ungoogled-chromium-binaries/releases/download/${UNGOOGLED_VERSION}/ungoogled-chromium_${UNGOOGLED_VERSION}_macos.dmg"
            ;;
        *)
            log_error "Unsupported platform: ${PLATFORM}"
            exit 1
            ;;
    esac

    log_info "Downloading from: ${DOWNLOAD_URL}"

    mkdir -p "${OUTPUT_DIR}"
    cd "${OUTPUT_DIR}"

    curl -L -o chromium-prebuilt.tar.xz "${DOWNLOAD_URL}"
    tar -xf chromium-prebuilt.tar.xz

    log_info "Pre-built Chromium downloaded and extracted!"
}

# Clean build artifacts
clean() {
    log_info "Cleaning build artifacts..."

    rm -rf "${WORK_DIR}"

    log_info "Clean completed!"
}

# Main menu
show_menu() {
    echo ""
    echo "=========================================="
    echo "Chromium Anti-Detection Build Script"
    echo "=========================================="
    echo "1. Full build from source (recommended for maximum customization)"
    echo "2. Download pre-built ungoogled-chromium (faster)"
    echo "3. Build with Docker (easier setup)"
    echo "4. Apply patches only (requires existing Chromium source)"
    echo "5. Clean build artifacts"
    echo "6. Exit"
    echo ""
}

# Main function
main() {
    check_prerequisites

    if [ $# -eq 0 ]; then
        show_menu
        read -p "Select option [1-6]: " choice
    else
        choice=$1
    fi

    case $choice in
        1)
            setup_build_dir
            download_ungoogled_chromium
            download_chromium_source
            apply_patches
            configure_build
            build_chromium
            package_binaries
            log_info "Build complete! Binaries are in ${OUTPUT_DIR}"
            ;;
        2)
            download_prebuilt
            log_info "Download complete! Binaries are in ${OUTPUT_DIR}"
            log_warn "Note: Pre-built binaries don't include our anti-detection patches."
            log_warn "For maximum protection, use option 1 or 3."
            ;;
        3)
            build_with_docker
            ;;
        4)
            apply_patches
            log_info "Patches applied! Now run: gn gen out/Default && ninja -C out/Default chrome"
            ;;
        5)
            clean
            ;;
        6)
            log_info "Exiting..."
            exit 0
            ;;
        *)
            log_error "Invalid option: $choice"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
