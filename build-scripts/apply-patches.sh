#!/bin/bash
#
# apply-patches.sh - Apply all anti-detection patches to Chromium
#
# This script applies all patches from the patches/ directory to Chromium source.
# Patches are applied in numerical order (001, 002, 003, etc.)
#
# Usage: bash build-scripts/apply-patches.sh
#
# To revert patches:
#   cd chromium/src && git reset --hard HEAD

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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PATCHES_DIR="$PROJECT_ROOT/patches"
CHROMIUM_SRC="${CHROMIUM_SRC:-$PROJECT_ROOT/chromium/src}"

# Validate directories
validate_directories() {
  print_msg "Validating directories..."

  if [ ! -d "$PATCHES_DIR" ]; then
    print_error "Patches directory not found: $PATCHES_DIR"
    exit 1
  fi

  if [ ! -d "$CHROMIUM_SRC" ]; then
    print_error "Chromium source not found: $CHROMIUM_SRC"
    print_msg "Please run setup-chromium.sh first"
    exit 1
  fi

  # Check if it's a git repo
  if [ ! -d "$CHROMIUM_SRC/.git" ]; then
    print_error "Chromium source is not a git repository"
    exit 1
  fi

  print_success "Directories validated"
}

# Count patches
count_patches() {
  PATCH_COUNT=$(ls -1 "$PATCHES_DIR"/*.patch 2>/dev/null | wc -l)
  if [ "$PATCH_COUNT" -eq 0 ]; then
    print_warning "No patches found in $PATCHES_DIR"
    exit 0
  fi
  print_msg "Found $PATCH_COUNT patches to apply"
}

# Check if patches are already applied
check_already_applied() {
  cd "$CHROMIUM_SRC"

  # Check git status
  if ! git diff --quiet; then
    print_warning "Chromium source has uncommitted changes"
    print_msg "Current changes:"
    git diff --stat

    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_msg "Aborted by user"
      exit 1
    fi
  fi
}

# Apply single patch
apply_patch() {
  local patch_file="$1"
  local patch_name="$(basename "$patch_file")"

  print_msg "Applying $patch_name..."

  # Check if patch can be applied
  if ! git apply --check "$patch_file" 2>/dev/null; then
    print_error "Patch $patch_name cannot be applied cleanly"

    # Try to show what failed
    print_msg "Attempting dry-run to show errors:"
    git apply --check "$patch_file" 2>&1 | head -20

    # Ask user what to do
    echo ""
    print_warning "Patch application failed. Options:"
    echo "  1) Skip this patch (continue)"
    echo "  2) Force apply (may cause conflicts)"
    echo "  3) Abort"
    read -p "Choose option (1/2/3): " -n 1 -r
    echo

    case $REPLY in
      1)
        print_warning "Skipping $patch_name"
        return 1
        ;;
      2)
        print_msg "Forcing patch application..."
        if git apply --reject "$patch_file"; then
          print_warning "Patch applied with conflicts (.rej files created)"
          return 2
        else
          print_error "Force apply failed"
          return 1
        fi
        ;;
      3)
        print_msg "Aborted by user"
        exit 1
        ;;
      *)
        print_error "Invalid option"
        exit 1
        ;;
    esac
  fi

  # Apply patch
  if git apply "$patch_file"; then
    print_success "Applied $patch_name"
    return 0
  else
    print_error "Failed to apply $patch_name"
    return 1
  fi
}

# Apply all patches
apply_all_patches() {
  cd "$CHROMIUM_SRC"

  local applied_count=0
  local skipped_count=0
  local conflict_count=0

  print_msg "Applying patches to $CHROMIUM_SRC..."
  echo ""

  # Sort patches by filename (numerical order)
  for patch_file in $(ls -1 "$PATCHES_DIR"/*.patch | sort); do
    apply_patch "$patch_file"
    local result=$?

    if [ $result -eq 0 ]; then
      ((applied_count++))
    elif [ $result -eq 1 ]; then
      ((skipped_count++))
    elif [ $result -eq 2 ]; then
      ((applied_count++))
      ((conflict_count++))
    fi

    echo ""
  done

  # Summary
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Patch Application Summary:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  print_success "Applied: $applied_count"
  if [ $skipped_count -gt 0 ]; then
    print_warning "Skipped: $skipped_count"
  fi
  if [ $conflict_count -gt 0 ]; then
    print_warning "With conflicts: $conflict_count"
    print_msg "Check for .rej files: find . -name '*.rej'"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Show git status
  echo ""
  print_msg "Git status after patches:"
  git diff --stat
}

# Create a commit with patches
create_commit() {
  cd "$CHROMIUM_SRC"

  if git diff --quiet; then
    print_msg "No changes to commit"
    return
  fi

  print_msg "Creating commit with applied patches..."

  # Add all changes
  git add -A

  # Create commit
  git commit -m "Apply UndetectBrowser anti-detection patches

Applied patches:
$(ls -1 "$PATCHES_DIR"/*.patch | xargs -n1 basename)

These patches add anti-detection features:
- WebGL fingerprint protection
- Canvas noise injection
- CDP detection removal
- And more...

Generated by: build-scripts/apply-patches.sh"

  print_success "Created commit with patches"
  print_msg "Commit hash: $(git rev-parse --short HEAD)"
}

# Print next steps
print_next_steps() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  print_success "Patches applied successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🔧 Next steps:"
  echo "  1. Build Chromium:   bash build-scripts/build-chromium.sh"
  echo "  2. Test the build:   ./chromium/src/out/Release/chrome"
  echo ""
  echo "⏮️  To revert patches:"
  echo "  cd $CHROMIUM_SRC"
  echo "  git reset --hard HEAD~1  # If committed"
  echo "  git reset --hard origin/main  # Full reset"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "         Apply Anti-Detection Patches to Chromium"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  validate_directories
  count_patches
  check_already_applied
  apply_all_patches

  # Ask if user wants to commit
  echo ""
  read -p "Create a git commit with these patches? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    create_commit
  fi

  print_next_steps
}

# Run main
main
