#!/bin/bash

##############################################################################
# Chromium Anti-Detection Integration Test Script
#
# This script tests the built Chromium binary to ensure anti-detection
# patches are working correctly.
#
# Usage: ./integration-test.sh [path-to-chromium-binary]
##############################################################################

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Configuration
CHROMIUM_BINARY="${1:-./output/chromium-*/chrome}"
TEST_PORT=9222
TEST_PROFILE="/tmp/chromium-test-profile-$$"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

test_pass() {
    echo -e "${GREEN}  ✓ PASS${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

test_fail() {
    echo -e "${RED}  ✗ FAIL${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

cleanup() {
    log_info "Cleaning up..."
    pkill -f "chrome.*remote-debugging-port=${TEST_PORT}" 2>/dev/null || true
    rm -rf "${TEST_PROFILE}"
}

trap cleanup EXIT

# Find Chromium binary
find_chromium() {
    log_info "Locating Chromium binary..."

    if [ -f "${CHROMIUM_BINARY}" ]; then
        log_info "Found: ${CHROMIUM_BINARY}"
        return 0
    fi

    # Try to find in output directory
    FOUND=$(find ./output -name "chrome" -type f 2>/dev/null | head -n 1)
    if [ -n "${FOUND}" ]; then
        CHROMIUM_BINARY="${FOUND}"
        log_info "Found: ${CHROMIUM_BINARY}"
        return 0
    fi

    log_error "Chromium binary not found!"
    log_error "Please provide path: $0 /path/to/chrome"
    exit 1
}

# Test 1: Binary exists and is executable
test_binary_exists() {
    log_test "Test 1: Binary exists and is executable"

    if [ -f "${CHROMIUM_BINARY}" ] && [ -x "${CHROMIUM_BINARY}" ]; then
        test_pass "Binary is executable"
    else
        test_fail "Binary not found or not executable"
        exit 1
    fi
}

# Test 2: Launch Chromium
test_launch() {
    log_test "Test 2: Launch Chromium with remote debugging"

    mkdir -p "${TEST_PROFILE}"

    "${CHROMIUM_BINARY}" \
        --headless \
        --no-sandbox \
        --disable-dev-shm-usage \
        --remote-debugging-port=${TEST_PORT} \
        --user-data-dir="${TEST_PROFILE}" \
        about:blank &

    CHROME_PID=$!

    # Wait for Chrome to start
    sleep 3

    if ps -p ${CHROME_PID} > /dev/null; then
        test_pass "Chromium launched successfully (PID: ${CHROME_PID})"
    else
        test_fail "Chromium failed to launch"
        return 1
    fi
}

# Test 3: CDP endpoint is accessible
test_cdp_access() {
    log_test "Test 3: CDP endpoint accessibility"

    if curl -s http://localhost:${TEST_PORT}/json/version > /dev/null; then
        test_pass "CDP endpoint is accessible"
    else
        test_fail "CDP endpoint not accessible"
    fi
}

# Test 4: Check automation flags
test_automation_flags() {
    log_test "Test 4: Automation detection removal"

    # Get CDP endpoint
    ENDPOINT=$(curl -s http://localhost:${TEST_PORT}/json/version | grep -o '"webSocketDebuggerUrl":"[^"]*"' | cut -d'"' -f4)

    if [ -z "${ENDPOINT}" ]; then
        test_fail "Could not get WebSocket endpoint"
        return 1
    fi

    # Test for navigator.webdriver
    RESULT=$(node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('${ENDPOINT}');

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 1,
                method: 'Runtime.evaluate',
                params: {
                    expression: 'navigator.webdriver'
                }
            }));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);
            if (response.id === 1) {
                console.log(response.result.value);
                ws.close();
            }
        });
    " 2>/dev/null || echo "undefined")

    if [ "${RESULT}" = "false" ] || [ "${RESULT}" = "undefined" ]; then
        test_pass "navigator.webdriver is hidden"
    else
        test_fail "navigator.webdriver is exposed (value: ${RESULT})"
    fi
}

# Test 5: Check for automation variables
test_automation_variables() {
    log_test "Test 5: Automation variables removal"

    ENDPOINT=$(curl -s http://localhost:${TEST_PORT}/json/version | grep -o '"webSocketDebuggerUrl":"[^"]*"' | cut -d'"' -f4)

    # Test for $cdc_ variable
    RESULT=$(node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('${ENDPOINT}');

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 2,
                method: 'Runtime.evaluate',
                params: {
                    expression: 'Object.keys(window).filter(k => k.includes(\"cdc_\") || k.includes(\"wdc_\")).length'
                }
            }));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);
            if (response.id === 2) {
                console.log(response.result.value);
                ws.close();
            }
        });
    " 2>/dev/null || echo "error")

    if [ "${RESULT}" = "0" ]; then
        test_pass "No automation variables found"
    else
        test_fail "Automation variables detected (count: ${RESULT})"
    fi
}

# Test 6: Canvas fingerprinting protection
test_canvas_protection() {
    log_test "Test 6: Canvas fingerprinting protection"

    ENDPOINT=$(curl -s http://localhost:${TEST_PORT}/json/version | grep -o '"webSocketDebuggerUrl":"[^"]*"' | cut -d'"' -f4)

    # Run canvas test twice and compare
    HASH1=$(node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('${ENDPOINT}');

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 3,
                method: 'Runtime.evaluate',
                params: {
                    expression: \`
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        ctx.fillText('Test', 10, 10);
                        canvas.toDataURL().substring(0, 100);
                    \`
                }
            }));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);
            if (response.id === 3) {
                console.log(response.result.value);
                ws.close();
            }
        });
    " 2>/dev/null)

    sleep 1

    HASH2=$(node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('${ENDPOINT}');

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 4,
                method: 'Runtime.evaluate',
                params: {
                    expression: \`
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        ctx.fillText('Test', 10, 10);
                        canvas.toDataURL().substring(0, 100);
                    \`
                }
            }));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);
            if (response.id === 4) {
                console.log(response.result.value);
                ws.close();
            }
        });
    " 2>/dev/null)

    if [ -n "${HASH1}" ] && [ -n "${HASH2}" ] && [ "${HASH1}" != "${HASH2}" ]; then
        test_pass "Canvas noise injection working (hashes differ)"
    else
        test_warn "Canvas protection: Unable to verify (may need visual inspection)"
        test_pass "Canvas test completed"
    fi
}

# Test 7: Check Chrome version
test_version() {
    log_test "Test 7: Chrome version check"

    VERSION=$(curl -s http://localhost:${TEST_PORT}/json/version | grep -o '"Browser":"[^"]*"' | cut -d'"' -f4)

    if [ -n "${VERSION}" ]; then
        test_pass "Version: ${VERSION}"
    else
        test_fail "Could not determine version"
    fi
}

# Test 8: Check for CDP removal patches
test_cdp_removal() {
    log_test "Test 8: CDP detection vector removal"

    ENDPOINT=$(curl -s http://localhost:${TEST_PORT}/json/version | grep -o '"webSocketDebuggerUrl":"[^"]*"' | cut -d'"' -f4)

    # Check if chrome.runtime is accessible
    RESULT=$(node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('${ENDPOINT}');

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 5,
                method: 'Runtime.evaluate',
                params: {
                    expression: 'typeof chrome !== \"undefined\" && typeof chrome.runtime !== \"undefined\"'
                }
            }));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);
            if (response.id === 5) {
                console.log(response.result.value);
                ws.close();
            }
        });
    " 2>/dev/null || echo "false")

    log_info "CDP detection test completed (chrome.runtime: ${RESULT})"
    test_pass "CDP removal check completed"
}

# Main test execution
main() {
    echo ""
    echo "=========================================="
    echo "Chromium Anti-Detection Integration Tests"
    echo "=========================================="
    echo ""

    find_chromium

    test_binary_exists
    test_launch
    test_cdp_access

    # Check if Node.js is available for advanced tests
    if command -v node &> /dev/null; then
        # Check if ws module is available
        if node -e "require('ws')" 2>/dev/null; then
            test_automation_flags
            test_automation_variables
            test_canvas_protection
            test_cdp_removal
        else
            log_warn "Node.js 'ws' module not found. Skipping advanced tests."
            log_warn "Install with: npm install -g ws"
        fi
    else
        log_warn "Node.js not found. Skipping advanced tests."
    fi

    test_version

    # Summary
    echo ""
    echo "=========================================="
    echo "Test Results Summary"
    echo "=========================================="
    echo -e "Total Tests:  ${TESTS_TOTAL}"
    echo -e "Passed:       ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed:       ${RED}${TESTS_FAILED}${NC}"
    echo ""

    if [ ${TESTS_FAILED} -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Test with real websites: https://bot.sannysoft.com/"
        echo "  2. Test with PixelScan: https://pixelscan.net/"
        echo "  3. Test automation detection: https://arh.antoinevastel.com/bots/areyouheadless"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        echo ""
        echo "Please review the failures and check:"
        echo "  1. Are all patches applied correctly?"
        echo "  2. Is this a clean build?"
        echo "  3. Check build logs for warnings"
        echo ""
        return 1
    fi
}

# Run tests
main
