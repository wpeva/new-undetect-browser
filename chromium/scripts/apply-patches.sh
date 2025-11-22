#!/bin/bash
#
# Apply Anti-Detection Patches to Chromium
#
# This script applies all patches from the chromium/patches/ directory
# to the Chromium source code.
#
# Usage:
#   ./apply-patches.sh [--dry-run] [--reverse]
#
# Options:
#   --dry-run    Test patches without applying
#   --reverse    Reverse (unapply) patches
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
PATCHES_DIR="$PROJECT_DIR/chromium/patches"
CHROMIUM_DIR="${CHROMIUM_DIR:-$HOME/chromium/src}"

# Parse arguments
DRY_RUN=0
REVERSE=0
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=1
            ;;
        --reverse)
            REVERSE=1
            ;;
    esac
done

echo -e "${GREEN}=== Chromium Patch Application Script ===${NC}"
echo "Chromium directory: $CHROMIUM_DIR"
echo "Patches directory: $PATCHES_DIR"
echo ""

# Check Chromium directory exists
if [ ! -d "$CHROMIUM_DIR" ]; then
    echo -e "${RED}ERROR: Chromium directory not found: $CHROMIUM_DIR${NC}"
    echo "Please run fetch-chromium.sh first"
    exit 1
fi

# Check patches directory exists
if [ ! -d "$PATCHES_DIR" ]; then
    echo -e "${RED}ERROR: Patches directory not found: $PATCHES_DIR${NC}"
    exit 1
fi

# Count patches
PATCH_COUNT=$(ls -1 "$PATCHES_DIR"/*.patch 2>/dev/null | wc -l)
if [ "$PATCH_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}WARNING: No patches found in $PATCHES_DIR${NC}"
    exit 0
fi

echo -e "${BLUE}Found $PATCH_COUNT patches${NC}"
echo ""

# Change to Chromium directory
cd "$CHROMIUM_DIR"

# Track success/failure
APPLIED=0
FAILED=0
SKIPPED=0

# Apply patches in order
for patch_file in "$PATCHES_DIR"/*.patch; do
    patch_name=$(basename "$patch_file")

    echo -e "${BLUE}Processing: $patch_name${NC}"

    # Check if patch would apply cleanly
    if [ $DRY_RUN -eq 1 ]; then
        echo "  [DRY RUN] Testing patch..."
        if patch -p1 --dry-run < "$patch_file" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ Would apply cleanly${NC}"
            ((APPLIED++))
        else
            echo -e "  ${RED}✗ Would fail to apply${NC}"
            ((FAILED++))
        fi
        continue
    fi

    # Reverse patch
    if [ $REVERSE -eq 1 ]; then
        echo "  Reversing patch..."
        if patch -p1 -R < "$patch_file" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ Reversed successfully${NC}"
            ((APPLIED++))
        else
            echo -e "  ${YELLOW}⚠ Already reversed or not applied${NC}"
            ((SKIPPED++))
        fi
        continue
    fi

    # Apply patch
    echo "  Applying patch..."
    if patch -p1 < "$patch_file" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Applied successfully${NC}"
        ((APPLIED++))
    else
        # Check if already applied
        if patch -p1 -R --dry-run < "$patch_file" > /dev/null 2>&1; then
            echo -e "  ${YELLOW}⚠ Already applied${NC}"
            ((SKIPPED++))
        else
            echo -e "  ${RED}✗ Failed to apply${NC}"
            echo ""
            echo "  Conflict details:"
            patch -p1 < "$patch_file" || true
            echo ""
            echo "  To resolve manually:"
            echo "    cd $CHROMIUM_DIR"
            echo "    patch -p1 < $patch_file"
            echo "    # Fix conflicts"
            echo "    git diff > $patch_file.new"
            ((FAILED++))

            # Ask if user wants to continue
            if [ $FAILED -eq 1 ]; then
                read -p "Continue with remaining patches? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    break
                fi
            fi
        fi
    fi

    echo ""
done

# Summary
echo -e "${GREEN}=== Summary ===${NC}"
if [ $DRY_RUN -eq 1 ]; then
    echo "Dry run mode - no patches actually applied"
    echo "Would apply: $APPLIED"
    echo "Would fail: $FAILED"
elif [ $REVERSE -eq 1 ]; then
    echo "Reverse mode - patches unapplied"
    echo "Reversed: $APPLIED"
    echo "Skipped: $SKIPPED"
    echo "Failed: $FAILED"
else
    echo "Applied: $APPLIED"
    echo "Skipped (already applied): $SKIPPED"
    echo "Failed: $FAILED"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}All patches applied successfully!${NC}"
        echo ""
        echo "Next step: ./build.sh"

        # Create marker file
        echo "$(date)" > "$CHROMIUM_DIR/.patches-applied"
        echo "$PATCH_COUNT patches applied" >> "$CHROMIUM_DIR/.patches-applied"
    else
        echo -e "${RED}Some patches failed to apply.${NC}"
        echo "Please resolve conflicts manually before building."
        exit 1
    fi
fi

# Show git status
echo ""
echo -e "${BLUE}Git status:${NC}"
git status --short | head -20
if [ $(git status --short | wc -l) -gt 20 ]; then
    echo "... ($(git status --short | wc -l) files total)"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
