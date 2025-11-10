#!/bin/bash
#
# build-chromium.sh - Build Chromium with anti-detection patches
#
# This script builds Chromium after patches have been applied.
# Build time: 1-6 hours depending on your hardware.
#
# Usage:
#   bash build-scripts/build-chromium.sh             # Release build
#   BUILD_TYPE=Debug bash build-scripts/build-chromium.sh  # Debug build
#   NUM_JOBS=8 bash build-scripts/build-chromium.sh  # Custom parallel jobs
#
# Environment variables:
#   BUILD_TYPE - Release (default) or Debug
#   NUM_JOBS - Number of parallel jobs (default: all CPU cores)
#   CHROMIUM_SRC - Chromium source directory

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_msg() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Configuration
BUILD_TYPE="${BUILD_TYPE:-Release}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CHROMIUM_SRC="${CHROMIUM_SRC:-$PROJECT_ROOT/chromium/src}"

# Detect number of CPU cores
if [ "$(uname)" == "Linux" ]; then
  DEFAULT_JOBS=$(nproc)
elif [ "$(uname)" == "Darwin" ]; then
  DEFAULT_JOBS=$(sysctl -n hw.ncpu)
else
  DEFAULT_JOBS=4
fi

NUM_JOBS="${NUM_JOBS:-$DEFAULT_JOBS}"

# Validate build type
validate_build_type() {
  if [ "$BUILD_TYPE" != "Release" ] && [ "$BUILD_TYPE" != "Debug" ]; then
    print_error "Invalid BUILD_TYPE: $BUILD_TYPE (must be Release or Debug)"
    exit 1
  fi
}

# Check prerequisites
check_prerequisites() {
  print_msg "Checking prerequisites..."

  # Check if Chromium source exists
  if [ ! -d "$CHROMIUM_SRC" ]; then
    print_error "Chromium source not found: $CHROMIUM_SRC"
    print_msg "Please run setup-chromium.sh first"
    exit 1
  fi

  # Check if depot_tools is in PATH
  if ! command -v gn &> /dev/null; then
    print_error "gn not found. Please install depot_tools and add to PATH"
    exit 1
  fi

  if ! command -v ninja &> /dev/null; then
    print_error "ninja not found. Please install depot_tools and add to PATH"
    exit 1
  fi

  print_success "Prerequisites OK"
}

# Print build configuration
print_config() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "                    Build Configuration"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Build Type:       $BUILD_TYPE"
  echo "  Parallel Jobs:    $NUM_JOBS"
  echo "  Source Directory: $CHROMIUM_SRC"
  echo "  Output Directory: $CHROMIUM_SRC/out/$BUILD_TYPE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Estimate build time
estimate_build_time() {
  print_msg "Estimating build time based on your hardware..."

  if [ "$NUM_JOBS" -ge 32 ]; then
    print_msg "With $NUM_JOBS cores: ~30-60 minutes (high-end server)"
  elif [ "$NUM_JOBS" -ge 16 ]; then
    print_msg "With $NUM_JOBS cores: ~1-2 hours (powerful workstation)"
  elif [ "$NUM_JOBS" -ge 8 ]; then
    print_msg "With $NUM_JOBS cores: ~2-4 hours (modern desktop)"
  elif [ "$NUM_JOBS" -ge 4 ]; then
    print_msg "With $NUM_JOBS cores: ~4-6 hours (older desktop)"
  else
    print_msg "With $NUM_JOBS cores: ~6+ hours (may be slow)"
    print_warning "Consider using more parallel jobs or a faster machine"
  fi

  echo ""
  read -p "Continue with this configuration? (Y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Nn]$ ]]; then
    print_msg "Build cancelled by user"
    exit 0
  fi
}

# Configure build with gn
configure_build() {
  print_msg "Configuring $BUILD_TYPE build with gn..."

  cd "$CHROMIUM_SRC"

  # Build arguments based on build type
  if [ "$BUILD_TYPE" == "Release" ]; then
    GN_ARGS="
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
      enable_stripping=true
      use_thin_lto=false
      use_sysroot=true
    "
  else
    GN_ARGS="
      is_debug=true
      symbol_level=1
      enable_nacl=false
      proprietary_codecs=true
      ffmpeg_branding=\"Chrome\"
      is_component_build=false
      treat_warnings_as_errors=false
      use_sysroot=true
    "
  fi

  # Run gn gen
  print_msg "Running: gn gen out/$BUILD_TYPE"
  if gn gen "out/$BUILD_TYPE" --args="$GN_ARGS"; then
    print_success "Build configured successfully"
  else
    print_error "gn gen failed"
    exit 1
  fi

  # Show generated args
  print_msg "Build arguments:"
  gn args "out/$BUILD_TYPE" --list --short | head -30
  echo "  ..."
}

# Build Chromium
build_chromium() {
  print_msg "Starting Chromium build..."
  print_msg "This will take 1-6 hours depending on your hardware"
  print_msg "You can monitor progress in another terminal:"
  print_msg "  watch -n 5 'ps aux | grep ninja'"
  echo ""

  cd "$CHROMIUM_SRC"

  local start_time=$(date +%s)

  # Run ninja build
  print_msg "Running: ninja -C out/$BUILD_TYPE -j $NUM_JOBS chrome"
  echo ""

  if ninja -C "out/$BUILD_TYPE" -j "$NUM_JOBS" chrome; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local hours=$((duration / 3600))
    local minutes=$(((duration % 3600) / 60))

    echo ""
    print_success "Build completed successfully!"
    print_msg "Build time: ${hours}h ${minutes}m"
  else
    print_error "Build failed"
    print_msg "Check the error messages above"
    print_msg "Common issues:"
    print_msg "  - Out of memory: reduce NUM_JOBS"
    print_msg "  - Missing dependencies: run install-build-deps.sh"
    print_msg "  - Patch conflicts: check applied patches"
    exit 1
  fi
}

# Verify build
verify_build() {
  print_msg "Verifying build..."

  cd "$CHROMIUM_SRC/out/$BUILD_TYPE"

  # Check if chrome binary exists
  local chrome_binary
  if [ "$(uname)" == "Linux" ]; then
    chrome_binary="chrome"
  elif [ "$(uname)" == "Darwin" ]; then
    chrome_binary="Chromium.app/Contents/MacOS/Chromium"
  else
    chrome_binary="chrome.exe"
  fi

  if [ -f "$chrome_binary" ]; then
    print_success "Chrome binary found: $chrome_binary"

    # Get file size
    local size=$(du -h "$chrome_binary" | cut -f1)
    print_msg "Binary size: $size"

    # Check if executable
    if [ -x "$chrome_binary" ]; then
      print_success "Binary is executable"
    else
      print_warning "Binary is not executable"
    fi

    # Show version (if possible)
    if [ "$(uname)" == "Linux" ] && [ -x "$chrome_binary" ]; then
      print_msg "Chrome version:"
      ./"$chrome_binary" --version 2>/dev/null || echo "  (version check not available)"
    fi

  else
    print_error "Chrome binary not found at expected location"
    print_msg "Expected: $CHROMIUM_SRC/out/$BUILD_TYPE/$chrome_binary"
    exit 1
  fi
}

# Print summary and next steps
print_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  print_success "Chromium build completed successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📦 Build location: $CHROMIUM_SRC/out/$BUILD_TYPE/"
  echo "📊 Build size: $(du -sh "$CHROMIUM_SRC/out/$BUILD_TYPE" | cut -f1)"
  echo ""
  echo "🚀 Run Chromium:"

  if [ "$(uname)" == "Linux" ]; then
    echo "  cd $CHROMIUM_SRC/out/$BUILD_TYPE"
    echo "  ./chrome"
    echo ""
    echo "  # With anti-detection env vars:"
    echo "  WEBGL_VENDOR=\"Intel Inc.\" \\"
    echo "  WEBGL_RENDERER=\"Intel(R) UHD Graphics 630\" \\"
    echo "  CANVAS_NOISE_SEED=\"12345\" \\"
    echo "  HIDE_CDP_DETECTION=\"true\" \\"
    echo "  ./chrome"

  elif [ "$(uname)" == "Darwin" ]; then
    echo "  open $CHROMIUM_SRC/out/$BUILD_TYPE/Chromium.app"
    echo ""
    echo "  # With env vars:"
    echo "  WEBGL_VENDOR=\"Intel Inc.\" \\"
    echo "  CANVAS_NOISE_SEED=\"12345\" \\"
    echo "  open $CHROMIUM_SRC/out/$BUILD_TYPE/Chromium.app"

  else
    echo "  $CHROMIUM_SRC\\out\\$BUILD_TYPE\\chrome.exe"
  fi

  echo ""
  echo "📦 Package for distribution:"
  echo "  bash build-scripts/package-chromium.sh"
  echo ""
  echo "🧪 Test anti-detection:"
  echo "  Visit https://pixelscan.net/"
  echo "  Visit https://abrahamjuliot.github.io/creepjs/"
  echo "  Visit https://browserleaks.com/canvas"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              Build Chromium - UndetectBrowser Fork"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  validate_build_type
  check_prerequisites
  print_config
  estimate_build_time
  configure_build
  build_chromium
  verify_build
  print_summary
}

# Run main
main
