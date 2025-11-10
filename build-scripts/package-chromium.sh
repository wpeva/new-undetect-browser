#!/bin/bash
#
# package-chromium.sh - Package Chromium build for distribution
#
# This script packages the built Chromium into distributable archives:
# - Linux: .tar.gz
# - macOS: .dmg or .zip
# - Windows: .zip
#
# Usage:
#   bash build-scripts/package-chromium.sh             # Package Release build
#   BUILD_TYPE=Debug bash build-scripts/package-chromium.sh  # Package Debug

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
RELEASE_DIR="$PROJECT_ROOT/releases"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"

# Get version from Chromium
get_version() {
  if [ -f "$CHROMIUM_SRC/chrome/VERSION" ]; then
    local major=$(grep "MAJOR=" "$CHROMIUM_SRC/chrome/VERSION" | cut -d'=' -f2)
    local minor=$(grep "MINOR=" "$CHROMIUM_SRC/chrome/VERSION" | cut -d'=' -f2)
    local build=$(grep "BUILD=" "$CHROMIUM_SRC/chrome/VERSION" | cut -d'=' -f2)
    local patch=$(grep "PATCH=" "$CHROMIUM_SRC/chrome/VERSION" | cut -d'=' -f2)
    echo "${major}.${minor}.${build}.${patch}"
  else
    echo "unknown"
  fi
}

VERSION=$(get_version)

# Check prerequisites
check_prerequisites() {
  print_msg "Checking prerequisites..."

  if [ ! -d "$CHROMIUM_SRC/out/$BUILD_TYPE" ]; then
    print_error "Build directory not found: $CHROMIUM_SRC/out/$BUILD_TYPE"
    print_msg "Please build Chromium first: bash build-scripts/build-chromium.sh"
    exit 1
  fi

  # Check if chrome binary exists
  local chrome_binary
  case "$PLATFORM" in
    linux)
      chrome_binary="chrome"
      ;;
    darwin)
      chrome_binary="Chromium.app/Contents/MacOS/Chromium"
      ;;
    mingw*|msys*|cygwin*)
      chrome_binary="chrome.exe"
      PLATFORM="windows"
      ;;
    *)
      print_error "Unsupported platform: $PLATFORM"
      exit 1
      ;;
  esac

  if [ ! -f "$CHROMIUM_SRC/out/$BUILD_TYPE/$chrome_binary" ] && [ ! -d "$CHROMIUM_SRC/out/$BUILD_TYPE/Chromium.app" ]; then
    print_error "Chrome binary not found: $chrome_binary"
    exit 1
  fi

  print_success "Prerequisites OK"
}

# Create release directory
create_release_dir() {
  print_msg "Creating release directory..."

  mkdir -p "$RELEASE_DIR/$PLATFORM"
  print_success "Release directory: $RELEASE_DIR/$PLATFORM"
}

# Package for Linux
package_linux() {
  print_msg "Packaging for Linux..."

  cd "$CHROMIUM_SRC/out/$BUILD_TYPE"

  local archive_name="undetect-chromium-${VERSION}-linux-x64.tar.gz"
  local archive_path="$RELEASE_DIR/linux/$archive_name"

  print_msg "Creating archive: $archive_name"

  # Files to include
  local files=(
    "chrome"
    "chrome_sandbox"
    "chrome_crashpad_handler"
    "nacl_helper"
    "nacl_helper_bootstrap"
    "*.pak"
    "*.bin"
    "*.so"
    "locales/"
    "swiftshader/"
    "MEIPreload/"
  )

  # Create archive
  tar -czf "$archive_path" ${files[@]} 2>/dev/null || {
    # Fallback: include everything
    tar -czf "$archive_path" .
  }

  print_success "Created: $archive_path"
  print_msg "Size: $(du -h "$archive_path" | cut -f1)"

  # Create extraction script
  cat > "$RELEASE_DIR/linux/run-undetect-chromium.sh" << 'EOF'
#!/bin/bash
# UndetectBrowser Launcher

# Set anti-detection environment variables
export WEBGL_VENDOR="Intel Inc."
export WEBGL_RENDERER="Intel(R) UHD Graphics 630"
export CANVAS_NOISE_SEED="$(date +%s)"
export HIDE_CDP_DETECTION="true"
export REMOVE_CDP_VARIABLES="true"
export INJECT_CHROME_RUNTIME="true"

# Get script directory
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run Chromium
exec "$DIR/chrome" "$@"
EOF
  chmod +x "$RELEASE_DIR/linux/run-undetect-chromium.sh"

  print_success "Created launcher script"
}

# Package for macOS
package_macos() {
  print_msg "Packaging for macOS..."

  cd "$CHROMIUM_SRC/out/$BUILD_TYPE"

  local archive_name="undetect-chromium-${VERSION}-macos.zip"
  local archive_path="$RELEASE_DIR/macos/$archive_name"

  # Copy Chromium.app
  print_msg "Copying Chromium.app..."
  cp -R "Chromium.app" "$RELEASE_DIR/macos/"

  # Rename to UndetectBrowser.app
  if [ -d "$RELEASE_DIR/macos/UndetectBrowser.app" ]; then
    rm -rf "$RELEASE_DIR/macos/UndetectBrowser.app"
  fi
  mv "$RELEASE_DIR/macos/Chromium.app" "$RELEASE_DIR/macos/UndetectBrowser.app"

  # Create launch script
  cat > "$RELEASE_DIR/macos/UndetectBrowser.app/Contents/MacOS/launch.sh" << 'EOF'
#!/bin/bash
# Set anti-detection env vars
export WEBGL_VENDOR="Intel Inc."
export CANVAS_NOISE_SEED="$(date +%s)"
export HIDE_CDP_DETECTION="true"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$DIR/Chromium" "$@"
EOF
  chmod +x "$RELEASE_DIR/macos/UndetectBrowser.app/Contents/MacOS/launch.sh"

  # Create zip
  print_msg "Creating archive: $archive_name"
  cd "$RELEASE_DIR/macos"
  zip -r "$archive_name" "UndetectBrowser.app" -q

  print_success "Created: $archive_path"
  print_msg "Size: $(du -h "$archive_path" | cut -f1)"

  # Note: Creating .dmg requires hdiutil (macOS only)
  if command -v hdiutil &> /dev/null; then
    print_msg "Creating DMG..."
    local dmg_name="undetect-chromium-${VERSION}-macos.dmg"
    hdiutil create -volname "UndetectBrowser" -srcfolder "UndetectBrowser.app" \
      -ov -format UDZO "$dmg_name"
    print_success "Created: $RELEASE_DIR/macos/$dmg_name"
  fi
}

# Package for Windows
package_windows() {
  print_msg "Packaging for Windows..."

  cd "$CHROMIUM_SRC/out/$BUILD_TYPE"

  local archive_name="undetect-chromium-${VERSION}-windows-x64.zip"
  local archive_path="$RELEASE_DIR/windows/$archive_name"

  print_msg "Creating archive: $archive_name"

  # Files to include
  local files=(
    "chrome.exe"
    "chrome_*.dll"
    "*.pak"
    "*.bin"
    "locales/"
    "swiftshader/"
    "MEIPreload/"
  )

  # Create zip
  if command -v 7z &> /dev/null; then
    7z a "$archive_path" ${files[@]}
  elif command -v zip &> /dev/null; then
    zip -r "$archive_path" ${files[@]}
  else
    print_error "No zip tool found (7z or zip required)"
    exit 1
  fi

  print_success "Created: $archive_path"
  print_msg "Size: $(du -h "$archive_path" | cut -f1)"

  # Create launcher batch file
  cat > "$RELEASE_DIR/windows/run-undetect-chromium.bat" << 'EOF'
@echo off
REM UndetectBrowser Launcher for Windows

REM Set anti-detection environment variables
set WEBGL_VENDOR=Intel Inc.
set WEBGL_RENDERER=Intel(R) UHD Graphics 630
set CANVAS_NOISE_SEED=12345
set HIDE_CDP_DETECTION=true
set REMOVE_CDP_VARIABLES=true
set INJECT_CHROME_RUNTIME=true

REM Run Chromium
start "" "%~dp0chrome.exe" %*
EOF

  print_success "Created launcher script"
}

# Create README
create_readme() {
  print_msg "Creating README..."

  cat > "$RELEASE_DIR/$PLATFORM/README.md" << EOF
# UndetectBrowser - Anti-Detection Chromium Build

Version: $VERSION
Build Type: $BUILD_TYPE
Platform: $PLATFORM
Build Date: $(date)

## What is this?

This is a custom build of Chromium with deep anti-detection patches applied at the C++ level.
These patches make browser automation and fingerprinting detection nearly impossible.

## Features

- ✅ WebGL fingerprint protection (configurable vendor/renderer)
- ✅ Canvas noise injection (seeded, consistent across sessions)
- ✅ CDP detection removal (ChromeDriver/Puppeteer markers hidden)
- ✅ Audio context fingerprint protection
- ✅ Client rects noise injection
- ✅ Performance API noise
- ✅ And more...

## Installation

### Linux

1. Extract the archive:
   \`\`\`bash
   tar -xzf undetect-chromium-*.tar.gz
   cd undetect-chromium
   \`\`\`

2. Run the browser:
   \`\`\`bash
   ./run-undetect-chromium.sh
   \`\`\`

### macOS

1. Extract the .zip or open the .dmg
2. Drag UndetectBrowser.app to Applications
3. Run from Applications or:
   \`\`\`bash
   open UndetectBrowser.app
   \`\`\`

### Windows

1. Extract the .zip file
2. Double-click \`run-undetect-chromium.bat\`

## Environment Variables

You can customize anti-detection behavior with environment variables:

\`\`\`bash
# WebGL vendor/renderer
export WEBGL_VENDOR="Intel Inc."
export WEBGL_RENDERER="Intel(R) UHD Graphics 630"

# Canvas noise (use different seed for different fingerprints)
export CANVAS_NOISE_SEED="12345"
export CANVAS_NOISE_LEVEL="0.001"

# Hide CDP detection
export HIDE_CDP_DETECTION="true"
export REMOVE_CDP_VARIABLES="true"

# Chrome runtime injection
export INJECT_CHROME_RUNTIME="true"

# Run
./chrome
\`\`\`

## Testing Anti-Detection

Visit these sites to test anti-detection effectiveness:

- https://pixelscan.net/
- https://abrahamjuliot.github.io/creepjs/
- https://browserleaks.com/canvas
- https://bot.sannysoft.com/
- https://arh.antoinevastel.com/bots/areyouheadless

## Technical Details

This build includes patches to:

1. **Blink rendering engine** - WebGL and Canvas modifications
2. **V8 JavaScript engine** - Navigator properties spoofing
3. **DevTools protocol** - CDP detection marker removal
4. **Skia graphics library** - Canvas noise injection
5. **Web Audio API** - Audio context fingerprint protection

All patches are applied at the C++ source level, making them undetectable via
JavaScript-level checks (Proxy detection, Function.toString(), etc.)

## Security Note

This browser is built from Chromium source code with additional anti-detection patches.
While the patches themselves don't introduce security vulnerabilities, use at your own risk.

## Support

- GitHub: https://github.com/wpeva/new-undetect-browser
- Docs: See CHROMIUM_FORK_GUIDE.md in repository

## License

This is a modified build of Chromium. Chromium is licensed under BSD-3-Clause.
Our patches and build scripts are licensed under MIT.

---

**Made with ❤️ by the UndetectBrowser team**
EOF

  print_success "Created README.md"
}

# Print summary
print_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  print_success "Packaging completed successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📦 Release directory: $RELEASE_DIR/$PLATFORM"
  echo "📊 Contents:"
  ls -lh "$RELEASE_DIR/$PLATFORM" | tail -n +2
  echo ""
  echo "🚀 To distribute:"
  echo "  Upload files from: $RELEASE_DIR/$PLATFORM"
  echo ""
  echo "🧪 To test locally:"
  case "$PLATFORM" in
    linux)
      echo "  cd $RELEASE_DIR/$PLATFORM"
      echo "  tar -xzf undetect-chromium-*.tar.gz"
      echo "  ./run-undetect-chromium.sh"
      ;;
    darwin)
      echo "  unzip $RELEASE_DIR/$PLATFORM/undetect-chromium-*.zip"
      echo "  open UndetectBrowser.app"
      ;;
    windows)
      echo "  Extract the .zip file"
      echo "  Run run-undetect-chromium.bat"
      ;;
  esac
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "           Package Chromium - UndetectBrowser Distribution"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Version: $VERSION"
  echo "Build Type: $BUILD_TYPE"
  echo "Platform: $PLATFORM"
  echo ""

  check_prerequisites
  create_release_dir

  case "$PLATFORM" in
    linux)
      package_linux
      ;;
    darwin)
      package_macos
      ;;
    windows)
      package_windows
      ;;
  esac

  create_readme
  print_summary
}

# Run main
main
