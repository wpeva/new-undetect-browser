#!/bin/bash
#
# setup-chromium.sh - Initial Chromium setup script
#
# This script:
# 1. Installs depot_tools (Chromium build tools)
# 2. Fetches Chromium source code (~20GB download)
# 3. Syncs all dependencies
# 4. Installs build dependencies for your platform
#
# Usage: bash build-scripts/setup-chromium.sh
#
# Requirements:
# - 100GB+ free disk space
# - Fast internet connection
# - 30-60 minutes of time

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
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

# Check system requirements
check_requirements() {
  print_msg "Checking system requirements..."

  # Check disk space (need at least 100GB)
  available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
  if [ "$available_space" -lt 100 ]; then
    print_error "Insufficient disk space! Need at least 100GB, have ${available_space}GB"
    exit 1
  fi
  print_success "Disk space: ${available_space}GB available"

  # Check RAM (recommend at least 16GB)
  if [ "$(uname)" == "Linux" ]; then
    total_ram=$(free -g | grep Mem | awk '{print $2}')
    if [ "$total_ram" -lt 16 ]; then
      print_warning "Low RAM detected (${total_ram}GB). Build may be slow. Recommend 16GB+"
    else
      print_success "RAM: ${total_ram}GB"
    fi
  fi

  # Check CPU cores
  cpu_cores=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "unknown")
  print_success "CPU cores: $cpu_cores"

  # Estimate build time
  if [ "$cpu_cores" != "unknown" ]; then
    if [ "$cpu_cores" -ge 16 ]; then
      print_msg "Estimated build time: 1-2 hours (with $cpu_cores cores)"
    elif [ "$cpu_cores" -ge 8 ]; then
      print_msg "Estimated build time: 2-4 hours (with $cpu_cores cores)"
    else
      print_msg "Estimated build time: 4-6+ hours (with $cpu_cores cores)"
    fi
  fi
}

# Install depot_tools
install_depot_tools() {
  print_msg "Installing depot_tools..."

  if [ -d "$HOME/depot_tools" ]; then
    print_warning "depot_tools already exists at $HOME/depot_tools"
    print_msg "Updating depot_tools..."
    cd "$HOME/depot_tools"
    git pull
  else
    print_msg "Cloning depot_tools..."
    git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git "$HOME/depot_tools"
  fi

  # Add to PATH
  export PATH="$HOME/depot_tools:$PATH"

  # Update shell config
  SHELL_CONFIG="$HOME/.bashrc"
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
  fi

  if ! grep -q "depot_tools" "$SHELL_CONFIG"; then
    print_msg "Adding depot_tools to $SHELL_CONFIG..."
    echo '' >> "$SHELL_CONFIG"
    echo '# Chromium depot_tools' >> "$SHELL_CONFIG"
    echo 'export PATH="$HOME/depot_tools:$PATH"' >> "$SHELL_CONFIG"
    print_success "Added depot_tools to PATH"
  else
    print_success "depot_tools already in PATH"
  fi

  # Verify installation
  if command -v gclient &> /dev/null; then
    print_success "depot_tools installed successfully"
    gclient --version
  else
    print_error "depot_tools installation failed"
    exit 1
  fi
}

# Fetch Chromium source code
fetch_chromium() {
  print_msg "Fetching Chromium source code..."
  print_warning "This will download ~20GB of data and may take 30-60 minutes"

  # Create chromium directory if it doesn't exist
  if [ ! -d "chromium" ]; then
    mkdir -p chromium
    print_success "Created chromium directory"
  fi

  cd chromium

  # Check if src already exists
  if [ -d "src" ]; then
    print_warning "Chromium source already exists at chromium/src"
    print_msg "Syncing existing checkout..."
    cd src
    gclient sync
  else
    print_msg "Starting Chromium fetch (this will take a while)..."

    # Fetch Chromium without history to save space
    fetch --nohooks --no-history chromium

    print_success "Chromium source fetched successfully"
    print_msg "Source code location: $(pwd)/src"
  fi

  cd ..
}

# Sync dependencies
sync_dependencies() {
  print_msg "Syncing Chromium dependencies..."

  cd chromium/src

  # Run gclient sync
  print_msg "Running gclient sync (this may take 10-20 minutes)..."
  gclient sync

  print_success "Dependencies synced successfully"

  cd ../..
}

# Install build dependencies
install_build_deps() {
  print_msg "Installing build dependencies..."

  cd chromium/src

  # Linux-specific build deps
  if [ "$(uname)" == "Linux" ]; then
    print_msg "Installing Linux build dependencies..."

    # Check if script exists
    if [ -f "build/install-build-deps.sh" ]; then
      # Run with sudo
      print_warning "This will install system packages. You may need to enter your password."
      sudo ./build/install-build-deps.sh --no-prompt

      print_success "Build dependencies installed"
    else
      print_error "build/install-build-deps.sh not found"
      exit 1
    fi

  # macOS-specific
  elif [ "$(uname)" == "Darwin" ]; then
    print_msg "macOS detected"
    print_msg "Make sure you have Xcode and Command Line Tools installed:"
    print_msg "  xcode-select --install"

  # Windows (MSYS2/Git Bash)
  else
    print_warning "Unsupported platform for automatic dependency installation"
    print_msg "Please install Visual Studio 2022 manually on Windows"
  fi

  cd ../..
}

# Print summary
print_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  print_success "Chromium setup completed successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📁 Source location: $(pwd)/chromium/src"
  echo "📦 Total size: ~$(du -sh chromium 2>/dev/null | cut -f1 || echo 'unknown')"
  echo ""
  echo "🔧 Next steps:"
  echo "  1. Apply patches:    bash build-scripts/apply-patches.sh"
  echo "  2. Build Chromium:   bash build-scripts/build-chromium.sh"
  echo "  3. Run browser:      ./chromium/src/out/Release/chrome"
  echo ""
  echo "⚡ Environment variables for anti-detection:"
  echo "  export WEBGL_VENDOR=\"Intel Inc.\""
  echo "  export WEBGL_RENDERER=\"Intel(R) UHD Graphics 630\""
  echo "  export CANVAS_NOISE_SEED=\"12345\""
  echo "  export HIDE_CDP_DETECTION=\"true\""
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "        Chromium Fork Setup - UndetectBrowser Project"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  check_requirements
  install_depot_tools
  fetch_chromium
  sync_dependencies
  install_build_deps
  print_summary
}

# Run main function
main
