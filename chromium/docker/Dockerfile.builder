# Chromium Builder Docker Image
#
# This Dockerfile creates a complete environment for building Chromium
# with anti-detection patches.
#
# Usage:
#   docker build -f Dockerfile.builder -t chromium-builder .
#   docker run -v $(pwd):/workspace chromium-builder
#
# Output:
#   /workspace/chromium-antidetect-linux-x64.tar.gz
#

FROM ubuntu:22.04

LABEL maintainer="Anti-Detect Browser Team"
LABEL description="Chromium build environment with anti-detection patches"
LABEL version="1.0"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Set up locale
RUN apt-get update && apt-get install -y locales && \
    locale-gen en_US.UTF-8 && \
    update-locale LANG=en_US.UTF-8

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Essential build tools
    git python3 python3-pip curl wget unzip lsb-release sudo \
    build-essential ninja-build pkg-config \
    # Chromium dependencies
    libglib2.0-dev libgtk-3-dev libdbus-1-dev \
    libnss3-dev libxss-dev libasound2-dev \
    libcups2-dev libxkbcommon-dev libxrandr-dev \
    libpango1.0-dev libatk1.0-dev libatk-bridge2.0-dev \
    libdrm-dev libgbm-dev libnspr4-dev \
    libexpat1-dev libffi-dev libgdk-pixbuf2.0-dev \
    libgtk2.0-dev libxslt1-dev libxml2-dev \
    libpulse-dev libxt-dev libxext-dev \
    # Additional utilities
    ccache time rsync && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js (for some build scripts)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user for building
RUN useradd -m -s /bin/bash builder && \
    echo "builder ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up ccache
RUN mkdir -p /ccache && \
    chown builder:builder /ccache
ENV CCACHE_DIR=/ccache
ENV CCACHE_MAXSIZE=50G
ENV CCACHE_CPP2=yes
ENV CCACHE_SLOPPINESS=time_macros
ENV PATH="/usr/lib/ccache:${PATH}"

# Switch to builder user
USER builder
WORKDIR /home/builder

# Install depot_tools
RUN git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git && \
    echo 'export PATH="$HOME/depot_tools:$PATH"' >> ~/.bashrc

ENV PATH="/home/builder/depot_tools:${PATH}"

# Configure git
RUN git config --global user.name "Chromium Builder" && \
    git config --global user.email "builder@antidetect.local" && \
    git config --global core.autocrlf false && \
    git config --global core.filemode false

# Pre-create chromium directory
RUN mkdir -p /home/builder/chromium

# Create build script
RUN cat > /home/builder/build-chromium.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

echo "=== Chromium Anti-Detect Builder ==="
echo "Started at: $(date)"
echo ""

# Configuration
WORKSPACE="/workspace"
CHROMIUM_DIR="/home/builder/chromium"
PATCHES_DIR="$WORKSPACE/chromium/patches"
SCRIPTS_DIR="$WORKSPACE/chromium/scripts"
OUTPUT_DIR="$WORKSPACE"

# Check workspace mounted
if [ ! -d "$WORKSPACE/chromium" ]; then
    echo "ERROR: Workspace not mounted or chromium/ directory not found"
    echo "Please mount your project directory:"
    echo "  docker run -v /path/to/new-undetect-browser:/workspace chromium-builder"
    exit 1
fi

# Fetch Chromium if not already present
if [ ! -d "$CHROMIUM_DIR/src" ]; then
    echo "Fetching Chromium source..."
    cd "$CHROMIUM_DIR"

    # Create .gclient
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

    # Sync (this takes a while)
    gclient sync --with_branch_heads --with_tags --no-history

    # Checkout stable
    cd src
    LATEST_STABLE=$(curl -s 'https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux&num=1' | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['version'])")
    echo "Using Chromium version: $LATEST_STABLE"
    git checkout -b antidetect-build "$LATEST_STABLE"

    # Sync dependencies
    gclient sync -D

    # Install build dependencies
    sudo ./build/install-build-deps.sh --no-prompt --no-chromeos-fonts
else
    echo "Chromium source already present"
fi

# Apply patches
echo ""
echo "Applying patches..."
cd "$CHROMIUM_DIR/src"

for patch in "$PATCHES_DIR"/*.patch; do
    if [ -f "$patch" ]; then
        echo "  Applying $(basename $patch)..."
        if ! patch -p1 --forward < "$patch" > /dev/null 2>&1; then
            echo "    (already applied or failed)"
        fi
    fi
done

# Configure build
echo ""
echo "Configuring build..."
mkdir -p "$CHROMIUM_DIR/src/out/Release"
cp "$WORKSPACE/chromium/config/args.gn" "$CHROMIUM_DIR/src/out/Release/args.gn"

# Generate build files
gn gen out/Release

# Build
echo ""
echo "Building Chromium..."
echo "This will take 2-4 hours on first build..."

# Calculate optimal job count (1 job per 2GB RAM)
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
JOBS=$((TOTAL_RAM / 2))
if [ $JOBS -lt 1 ]; then JOBS=1; fi
if [ $JOBS -gt 16 ]; then JOBS=16; fi

echo "Using $JOBS parallel jobs"

START_TIME=$(date +%s)
autoninja -j$JOBS -C out/Release chrome chromedriver
END_TIME=$(date +%s)
DURATION=$((($END_TIME - $START_TIME) / 60))

echo ""
echo "Build completed in $DURATION minutes"

# Strip binaries
echo ""
echo "Stripping debug symbols..."
strip out/Release/chrome
strip out/Release/chromedriver

# Package
echo ""
echo "Packaging..."
cd out/Release
mkdir -p chromium-antidetect
cp chrome chromium-antidetect/
cp chromedriver chromium-antidetect/
cp -r locales chromium-antidetect/
cp *.pak chromium-antidetect/ 2>/dev/null || true
cp *.bin chromium-antidetect/ 2>/dev/null || true
cp icudtl.dat chromium-antidetect/ 2>/dev/null || true
cp libEGL.so libGLESv2.so chromium-antidetect/ 2>/dev/null || true
cp v8_context_snapshot.bin chromium-antidetect/ 2>/dev/null || true

VERSION=$(../../../chrome/VERSION | tr '\n' '.')
tar -czf "$OUTPUT_DIR/chromium-antidetect-linux-x64-$(date +%Y%m%d).tar.gz" chromium-antidetect/

# Generate checksums
cd "$OUTPUT_DIR"
sha256sum chromium-antidetect-*.tar.gz > chromium-antidetect.sha256
md5sum chromium-antidetect-*.tar.gz > chromium-antidetect.md5

echo ""
echo "=== Build Complete ==="
echo "Output: $OUTPUT_DIR/chromium-antidetect-linux-x64-$(date +%Y%m%d).tar.gz"
echo "Checksums: chromium-antidetect.sha256, chromium-antidetect.md5"
echo ""
ls -lh "$OUTPUT_DIR"/chromium-antidetect*
echo ""
echo "Finished at: $(date)"
EOFSCRIPT

chmod +x /home/builder/build-chromium.sh

# Set entrypoint
ENTRYPOINT ["/home/builder/build-chromium.sh"]

# Default workspace mount point
VOLUME ["/workspace"]

# Labels for identification
LABEL org.opencontainers.image.source="https://github.com/your-repo/new-undetect-browser"
LABEL org.opencontainers.image.description="Chromium builder with anti-detection patches"
LABEL org.opencontainers.image.licenses="MIT"
