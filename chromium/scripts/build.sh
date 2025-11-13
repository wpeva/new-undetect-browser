#!/bin/bash
#
# Build Custom Chromium Binary
#
# This script builds Chromium with optimized settings for anti-detection.
# First build: 2-4 hours
# Incremental builds: 5-30 minutes
#
# Usage:
#   ./build.sh [target] [--jobs N]
#
# Examples:
#   ./build.sh                    # Build chrome (default)
#   ./build.sh chromedriver       # Build chromedriver only
#   ./build.sh --jobs 8          # Build with 8 parallel jobs
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CHROMIUM_DIR="${CHROMIUM_DIR:-$HOME/chromium/src}"
BUILD_TYPE="Release"
BUILD_DIR="$CHROMIUM_DIR/out/$BUILD_TYPE"

# Parse arguments
TARGET="chrome"
JOBS=$(nproc)
BUILD_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --jobs)
            JOBS="$2"
            shift 2
            ;;
        --debug)
            BUILD_TYPE="Debug"
            BUILD_DIR="$CHROMIUM_DIR/out/$BUILD_TYPE"
            shift
            ;;
        chrome|chromedriver|unit_tests)
            TARGET="$1"
            shift
            ;;
        *)
            BUILD_ARGS="$BUILD_ARGS $1"
            shift
            ;;
    esac
done

echo -e "${GREEN}=== Chromium Build Script ===${NC}"
echo "Chromium directory: $CHROMIUM_DIR"
echo "Build type: $BUILD_TYPE"
echo "Build directory: $BUILD_DIR"
echo "Target: $TARGET"
echo "Parallel jobs: $JOBS"
echo ""

# Check Chromium directory
if [ ! -d "$CHROMIUM_DIR" ]; then
    echo -e "${RED}ERROR: Chromium directory not found: $CHROMIUM_DIR${NC}"
    echo "Please run fetch-chromium.sh first"
    exit 1
fi

# Check patches applied
if [ ! -f "$CHROMIUM_DIR/.patches-applied" ]; then
    echo -e "${YELLOW}WARNING: Patches don't appear to be applied${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd "$CHROMIUM_DIR"

# Check RAM
total_ram=$(free -g | awk '/^Mem:/{print $2}')
echo -e "${BLUE}System RAM: ${total_ram}GB${NC}"
if [ "$total_ram" -lt 16 ]; then
    echo -e "${YELLOW}WARNING: Low RAM. Build may fail or be very slow.${NC}"
    echo "Consider reducing jobs: --jobs 2"
fi

# Adjust jobs based on RAM (rough estimate: 2GB per job)
max_jobs=$((total_ram / 2))
if [ "$JOBS" -gt "$max_jobs" ]; then
    echo -e "${YELLOW}Reducing jobs from $JOBS to $max_jobs due to RAM constraints${NC}"
    JOBS=$max_jobs
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Copy or generate args.gn
if [ -f "$PROJECT_DIR/chromium/config/args.gn" ]; then
    echo -e "${BLUE}Copying args.gn from project...${NC}"
    cp "$PROJECT_DIR/chromium/config/args.gn" "$BUILD_DIR/args.gn"
else
    echo -e "${BLUE}Generating default args.gn...${NC}"
    cat > "$BUILD_DIR/args.gn" << 'EOF'
# Build type
is_debug = false
is_official_build = true
is_component_build = false

# Optimization
symbol_level = 0
blink_symbol_level = 0
enable_nacl = false
use_thin_lto = true

# Features
proprietary_codecs = true
ffmpeg_branding = "Chrome"
enable_pdf = false
enable_print_preview = false
enable_service_discovery = false
enable_hangout_services_extension = false
enable_widevine = false

# Performance
use_jumbo_build = true
concurrent_links = 2
use_gold = true

# Target
target_cpu = "x64"

# Warnings
fatal_linker_warnings = false
treat_warnings_as_errors = false

# Custom anti-detection flags (from patches)
# These are enabled by our patches
EOF
fi

# Run GN
echo -e "${GREEN}Running GN (generate build files)...${NC}"
gn gen "$BUILD_DIR"

# Verify GN success
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: GN generation failed${NC}"
    echo "Check args.gn for errors:"
    echo "  gn args out/$BUILD_TYPE"
    exit 1
fi

# Show final args
echo ""
echo -e "${BLUE}Build configuration:${NC}"
gn args "$BUILD_DIR" --list --short | head -20
echo ""

# Estimate build time
if [ -f "$BUILD_DIR/.build-completed" ]; then
    echo -e "${BLUE}Incremental build (previous build found)${NC}"
    echo "Estimated time: 5-30 minutes"
else
    echo -e "${BLUE}Full build (first time)${NC}"
    echo "Estimated time: 2-4 hours"
fi
echo ""

# Start build
echo -e "${GREEN}Starting build of target '$TARGET' with $JOBS jobs...${NC}"
echo "Started at: $(date)"
echo ""

start_time=$(date +%s)

# Use autoninja if available (recommended), otherwise ninja
if command -v autoninja &> /dev/null; then
    autoninja -C "$BUILD_DIR" "$TARGET" $BUILD_ARGS
else
    ninja -j"$JOBS" -C "$BUILD_DIR" "$TARGET" $BUILD_ARGS
fi

end_time=$(date +%s)
duration=$((end_time - start_time))
duration_mins=$((duration / 60))

# Check build success
if [ -f "$BUILD_DIR/chrome" ] || [ -f "$BUILD_DIR/$TARGET" ]; then
    echo ""
    echo -e "${GREEN}=== Build Successful ===${NC}"
    echo "Duration: $duration_mins minutes"
    echo ""

    # Show binary info
    if [ -f "$BUILD_DIR/chrome" ]; then
        chrome_size=$(du -h "$BUILD_DIR/chrome" | cut -f1)
        echo "Chrome binary: $BUILD_DIR/chrome"
        echo "Size: $chrome_size"
        echo ""

        # Test chrome
        echo -e "${BLUE}Testing chrome binary...${NC}"
        "$BUILD_DIR/chrome" --version
        echo ""
    fi

    # Create marker
    echo "$(date)" > "$BUILD_DIR/.build-completed"
    echo "$duration_mins minutes" >> "$BUILD_DIR/.build-completed"

    echo "Next steps:"
    echo "  1. Test: ./test.sh"
    echo "  2. Package: ./package.sh"
    echo ""
else
    echo -e "${RED}ERROR: Build failed${NC}"
    echo "Duration: $duration_mins minutes"
    echo ""
    echo "Check build log for errors"
    echo "Common issues:"
    echo "  - Out of memory: Reduce --jobs"
    echo "  - Missing dependencies: Run build/install-build-deps.sh"
    echo "  - Patch conflicts: Re-apply patches"
    exit 1
fi

# Optional: Strip binary
read -p "Strip debug symbols to reduce size? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}Stripping debug symbols...${NC}"
    strip "$BUILD_DIR/chrome"
    if [ -f "$BUILD_DIR/chromedriver" ]; then
        strip "$BUILD_DIR/chromedriver"
    fi

    new_size=$(du -h "$BUILD_DIR/chrome" | cut -f1)
    echo "New size: $new_size"
    echo ""
fi

echo -e "${GREEN}Done!${NC}"
