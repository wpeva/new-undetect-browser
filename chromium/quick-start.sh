#!/bin/bash

##############################################################################
# Chromium Anti-Detection Quick Start Script
#
# This script provides a simple, one-command way to build Chromium
# with anti-detection patches using Docker.
#
# Usage: ./quick-start.sh
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
OUTPUT_DIR="${SCRIPT_DIR}/output"

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
    echo -e "\n${BLUE}▶${NC} ${CYAN}$1${NC}\n"
}

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}║        ${BLUE}Chromium Anti-Detection Build System${CYAN}           ║${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}║${NC}  This will build a custom Chromium binary with:        ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}    ✓ Canvas fingerprinting protection                  ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}    ✓ WebGL fingerprint spoofing                        ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}    ✓ Automation detection removal                      ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}    ✓ CDP stealth mode                                  ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}    ✓ Permissions API protection                        ${CYAN}║${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_requirements() {
    log_step "Checking system requirements"

    local requirements_met=true

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        echo "  Install from: https://docs.docker.com/get-docker/"
        requirements_met=false
    else
        log_info "✓ Docker installed: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    fi

    # Check disk space
    local available_space=$(df -BG "${SCRIPT_DIR}" | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$available_space" -lt 40 ]; then
        log_warn "Low disk space: ${available_space}GB (recommended: 40GB+)"
        echo "  Build may fail if disk space runs out"
    else
        log_info "✓ Disk space: ${available_space}GB available"
    fi

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        echo "  Start Docker and try again"
        requirements_met=false
    else
        log_info "✓ Docker daemon is running"
    fi

    # Check memory
    local total_mem=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_mem" -lt 8 ]; then
        log_warn "Low memory: ${total_mem}GB (recommended: 8GB+)"
        echo "  Build may be slow or fail"
    else
        log_info "✓ Memory: ${total_mem}GB available"
    fi

    if [ "$requirements_met" = false ]; then
        echo ""
        log_error "Requirements not met. Please fix the issues above and try again."
        exit 1
    fi

    echo ""
}

show_build_info() {
    log_step "Build Information"

    cat << EOF
${YELLOW}⚠ Important Information:${NC}

  Build Time:     ${CYAN}2-6 hours${NC} (depending on CPU)
  Disk Usage:     ${CYAN}~35-40GB${NC} during build
  Final Size:     ${CYAN}~200-300MB${NC} (compressed)

  Docker Settings:
    - Container will use all available CPU cores
    - Memory limit: 16GB (adjust in docker-compose.yml if needed)
    - Build artifacts will be cleaned after packaging

  Output Location:
    ${CYAN}${OUTPUT_DIR}${NC}

EOF

    read -p "Continue with build? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Build cancelled by user"
        exit 0
    fi
}

prepare_environment() {
    log_step "Preparing build environment"

    # Create output directory
    mkdir -p "${OUTPUT_DIR}"
    log_info "✓ Output directory: ${OUTPUT_DIR}"

    # Verify patches exist
    if [ ! -d "${SCRIPT_DIR}/patches" ]; then
        log_error "Patches directory not found!"
        exit 1
    fi

    local patch_count=$(find "${SCRIPT_DIR}/patches" -name "*.patch" | wc -l)
    log_info "✓ Found ${patch_count} patches"

    # Verify Dockerfile exists
    if [ ! -f "${SCRIPT_DIR}/docker/Dockerfile.build" ]; then
        log_error "Dockerfile not found at ${SCRIPT_DIR}/docker/Dockerfile.build"
        exit 1
    fi
    log_info "✓ Dockerfile ready"

    # Verify build script exists
    if [ ! -f "${SCRIPT_DIR}/build-internal.sh" ]; then
        log_error "Build script not found at ${SCRIPT_DIR}/build-internal.sh"
        exit 1
    fi
    log_info "✓ Build script ready"

    echo ""
}

build_docker_image() {
    log_step "Building Docker image (this may take 10-20 minutes)"

    cd "${PROJECT_ROOT}"

    docker build \
        -f chromium/docker/Dockerfile.build \
        -t chromium-antidetect-builder:latest \
        . 2>&1 | tee "${OUTPUT_DIR}/docker-build.log"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_info "✓ Docker image built successfully"
    else
        log_error "Docker image build failed. Check ${OUTPUT_DIR}/docker-build.log"
        exit 1
    fi

    echo ""
}

run_chromium_build() {
    log_step "Building Chromium (this will take 2-6 hours)"

    echo -e "${YELLOW}Build started at: $(date)${NC}"
    echo -e "${YELLOW}You can monitor progress in the output below${NC}"
    echo ""

    local start_time=$(date +%s)

    # Run build in Docker
    docker run --rm \
        --name chromium-builder-$$ \
        -v "${PROJECT_ROOT}:/workspace:ro" \
        -v "${OUTPUT_DIR}:/output" \
        -e "CHROMIUM_VERSION=${CHROMIUM_VERSION:-122.0.6261.94}" \
        --cpus="$(nproc)" \
        --memory="16g" \
        --shm-size=2g \
        chromium-antidetect-builder:latest 2>&1 | tee "${OUTPUT_DIR}/build.log"

    local build_status=${PIPESTATUS[0]}
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local hours=$((duration / 3600))
    local minutes=$(((duration % 3600) / 60))

    echo ""
    if [ $build_status -eq 0 ]; then
        log_info "✓ Build completed successfully in ${hours}h ${minutes}m"
    else
        log_error "Build failed after ${hours}h ${minutes}m"
        log_error "Check ${OUTPUT_DIR}/build.log for details"
        exit 1
    fi

    echo ""
}

verify_build() {
    log_step "Verifying build output"

    # Find the output archive
    local archive=$(find "${OUTPUT_DIR}" -name "chromium-*.tar.gz" -type f | head -n 1)

    if [ -z "${archive}" ]; then
        log_error "No build artifact found in ${OUTPUT_DIR}"
        exit 1
    fi

    log_info "✓ Build artifact: $(basename ${archive})"
    log_info "  Size: $(du -h ${archive} | cut -f1)"

    # Check for checksum
    if [ -f "${archive}.sha256" ]; then
        log_info "✓ Checksum file: $(basename ${archive}).sha256"
    fi

    # Verify archive integrity
    if tar -tzf "${archive}" > /dev/null 2>&1; then
        log_info "✓ Archive integrity verified"
    else
        log_error "Archive appears to be corrupted"
        exit 1
    fi

    echo ""
}

show_next_steps() {
    local archive=$(find "${OUTPUT_DIR}" -name "chromium-*.tar.gz" -type f | head -n 1)

    cat << EOF

${GREEN}╔════════════════════════════════════════════════════════════╗${NC}
${GREEN}║                                                            ║${NC}
${GREEN}║                  ${CYAN}✓ BUILD SUCCESSFUL!${GREEN}                      ║${NC}
${GREEN}║                                                            ║${NC}
${GREEN}╚════════════════════════════════════════════════════════════╝${NC}

${CYAN}Build Output:${NC}
  Archive:  ${archive}
  Logs:     ${OUTPUT_DIR}/build.log

${CYAN}Next Steps:${NC}

  ${YELLOW}1. Extract the build:${NC}
     cd ${OUTPUT_DIR}
     tar -xzf $(basename ${archive})

  ${YELLOW}2. Test the build:${NC}
     cd ${SCRIPT_DIR}
     ./integration-test.sh ${OUTPUT_DIR}/chromium-*/chrome

  ${YELLOW}3. Run Chromium:${NC}
     cd ${OUTPUT_DIR}/chromium-*
     ./launch.sh

  ${YELLOW}4. Test with real sites:${NC}
     • https://bot.sannysoft.com/
     • https://pixelscan.net/
     • https://arh.antoinevastel.com/bots/areyouheadless

${CYAN}Integration with Undetect Browser:${NC}

  To use this Chromium build with your Undetect Browser:

  1. Update browser configuration in server/config.ts:
     ${YELLOW}chromiumPath: '${OUTPUT_DIR}/chromium-*/chrome'${NC}

  2. Restart the Undetect Browser server

  3. Test with a new profile

${YELLOW}⚠ Remember:${NC}
  • Test thoroughly before production use
  • Keep builds updated with security patches
  • Use responsibly and ethically

${GREEN}Build completed at: $(date)${NC}

EOF
}

cleanup_on_error() {
    log_error "Build interrupted or failed"

    # Stop any running containers
    docker ps -q --filter "name=chromium-builder" | xargs -r docker stop

    exit 1
}

trap cleanup_on_error INT TERM

main() {
    print_banner
    check_requirements
    show_build_info
    prepare_environment
    build_docker_image
    run_chromium_build
    verify_build
    show_next_steps
}

# Run main function
main "$@"
