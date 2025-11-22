#!/bin/bash
#
# Fetch Chromium Source Code
#
# This script downloads the Chromium source code using depot_tools.
# Estimated time: 30-60 minutes
# Estimated download: ~20GB
#
# Usage:
#   ./fetch-chromium.sh [version]
#
# Examples:
#   ./fetch-chromium.sh              # Fetch latest stable
#   ./fetch-chromium.sh 120.0.6099.109  # Fetch specific version
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CHROMIUM_DIR="${CHROMIUM_DIR:-$HOME/chromium}"
VERSION="${1:-stable}"

echo -e "${GREEN}=== Chromium Source Fetch Script ===${NC}"
echo "Target directory: $CHROMIUM_DIR"
echo "Version: $VERSION"
echo ""

# Check for depot_tools
if ! command -v gclient &> /dev/null; then
    echo -e "${RED}ERROR: depot_tools not found in PATH${NC}"
    echo "Please install depot_tools first:"
    echo "  git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git"
    echo "  export PATH=\"\$PATH:\$(pwd)/depot_tools\""
    exit 1
fi

# Check disk space (need at least 100GB)
available_space=$(df -BG "$HOME" | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$available_space" -lt 100 ]; then
    echo -e "${YELLOW}WARNING: Low disk space. At least 100GB recommended.${NC}"
    echo "Available: ${available_space}GB"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create working directory
mkdir -p "$CHROMIUM_DIR"
cd "$CHROMIUM_DIR"

# Create .gclient file
echo -e "${GREEN}Creating .gclient configuration...${NC}"
cat > .gclient << EOF
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

echo -e "${GREEN}Fetching Chromium source (this will take 30-60 minutes)...${NC}"
echo "Download size: ~20GB"
echo ""

# Initial sync
gclient sync --with_branch_heads --with_tags --no-history

# Navigate into source directory
cd src

# Checkout specific version if provided
if [ "$VERSION" != "stable" ]; then
    echo -e "${GREEN}Checking out version $VERSION...${NC}"
    git checkout -b antidetect-build "$VERSION"
else
    # Get latest stable version from Chromium Dash
    echo -e "${GREEN}Finding latest stable version...${NC}"
    LATEST_STABLE=$(curl -s 'https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux&num=1' | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['version'])")
    echo "Latest stable: $LATEST_STABLE"
    git checkout -b antidetect-build "$LATEST_STABLE"
fi

# Sync dependencies for this version
echo -e "${GREEN}Syncing dependencies...${NC}"
gclient sync -D

# Run build dependency installation
echo -e "${GREEN}Installing build dependencies...${NC}"
./build/install-build-deps.sh --no-prompt --no-chromeos-fonts

# Verify installation
if [ -f "chrome/VERSION" ]; then
    echo -e "${GREEN}=== Fetch Complete ===${NC}"
    echo ""
    echo "Chromium version:"
    cat chrome/VERSION
    echo ""
    echo "Source location: $CHROMIUM_DIR/src"
    echo "Next step: ./apply-patches.sh"
else
    echo -e "${RED}ERROR: Fetch failed. chrome/VERSION not found.${NC}"
    exit 1
fi

# Create marker file
echo "$(date)" > .chromium-fetched
echo "$VERSION" >> .chromium-fetched

echo -e "${GREEN}Done!${NC}"
