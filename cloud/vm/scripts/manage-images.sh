#!/bin/bash
# VM Image Management Helper
# Session 6: Hardware Virtualization Setup

set -e

IMAGE_DIR="/var/lib/undetect-browser/vm/images"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo "================================================"
    echo "$1"
    echo "================================================"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# List all VM images
list_images() {
    print_header "VM Images in $IMAGE_DIR"

    if [ ! -d "$IMAGE_DIR" ]; then
        print_warning "Image directory does not exist: $IMAGE_DIR"
        return
    fi

    cd "$IMAGE_DIR"

    for image in *.qcow2; do
        if [ -f "$image" ]; then
            echo ""
            echo "Image: $image"
            qemu-img info "$image" | grep -E "(file format|virtual size|disk size)"

            # List snapshots
            SNAPSHOTS=$(qemu-img snapshot -l "$image" 2>/dev/null | tail -n +3)
            if [ -n "$SNAPSHOTS" ]; then
                echo "Snapshots:"
                echo "$SNAPSHOTS" | awk '{print "  - " $2 " (" $3 " " $4 ")"}'
            fi
        fi
    done

    echo ""
}

# Create snapshot
create_snapshot() {
    local image="$1"
    local snapshot_name="$2"

    if [ -z "$image" ] || [ -z "$snapshot_name" ]; then
        print_error "Usage: $0 snapshot <image-name> <snapshot-name>"
        exit 1
    fi

    print_header "Creating snapshot: $snapshot_name"

    if [ ! -f "$IMAGE_DIR/$image" ]; then
        print_error "Image not found: $IMAGE_DIR/$image"
        exit 1
    fi

    qemu-img snapshot -c "$snapshot_name" "$IMAGE_DIR/$image"
    print_success "Snapshot created: $snapshot_name"

    # List all snapshots
    echo ""
    echo "All snapshots for $image:"
    qemu-img snapshot -l "$IMAGE_DIR/$image" | tail -n +3
}

# Restore snapshot
restore_snapshot() {
    local image="$1"
    local snapshot_name="$2"

    if [ -z "$image" ] || [ -z "$snapshot_name" ]; then
        print_error "Usage: $0 restore <image-name> <snapshot-name>"
        exit 1
    fi

    print_header "Restoring snapshot: $snapshot_name"

    if [ ! -f "$IMAGE_DIR/$image" ]; then
        print_error "Image not found: $IMAGE_DIR/$image"
        exit 1
    fi

    print_warning "This will revert the image to snapshot: $snapshot_name"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi

    qemu-img snapshot -a "$snapshot_name" "$IMAGE_DIR/$image"
    print_success "Snapshot restored: $snapshot_name"
}

# Delete snapshot
delete_snapshot() {
    local image="$1"
    local snapshot_name="$2"

    if [ -z "$image" ] || [ -z "$snapshot_name" ]; then
        print_error "Usage: $0 delete-snapshot <image-name> <snapshot-name>"
        exit 1
    fi

    print_header "Deleting snapshot: $snapshot_name"

    if [ ! -f "$IMAGE_DIR/$image" ]; then
        print_error "Image not found: $IMAGE_DIR/$image"
        exit 1
    fi

    qemu-img snapshot -d "$snapshot_name" "$IMAGE_DIR/$image"
    print_success "Snapshot deleted: $snapshot_name"
}

# Compact image
compact_image() {
    local image="$1"

    if [ -z "$image" ]; then
        print_error "Usage: $0 compact <image-name>"
        exit 1
    fi

    print_header "Compacting image: $image"

    if [ ! -f "$IMAGE_DIR/$image" ]; then
        print_error "Image not found: $IMAGE_DIR/$image"
        exit 1
    fi

    # Show current size
    echo "Current size:"
    qemu-img info "$IMAGE_DIR/$image" | grep "disk size"

    # Compact
    local temp_image="${image}.compact"
    echo ""
    echo "Compacting... (this may take a while)"
    qemu-img convert -O qcow2 -c "$IMAGE_DIR/$image" "$IMAGE_DIR/$temp_image"

    # Replace original
    mv "$IMAGE_DIR/$temp_image" "$IMAGE_DIR/$image"

    # Show new size
    echo ""
    echo "New size:"
    qemu-img info "$IMAGE_DIR/$image" | grep "disk size"

    print_success "Image compacted successfully"
}

# Resize image
resize_image() {
    local image="$1"
    local new_size="$2"

    if [ -z "$image" ] || [ -z "$new_size" ]; then
        print_error "Usage: $0 resize <image-name> <new-size>"
        print_error "Example: $0 resize windows11.qcow2 100G"
        exit 1
    fi

    print_header "Resizing image: $image"

    if [ ! -f "$IMAGE_DIR/$image" ]; then
        print_error "Image not found: $IMAGE_DIR/$image"
        exit 1
    fi

    # Show current size
    echo "Current virtual size:"
    qemu-img info "$IMAGE_DIR/$image" | grep "virtual size"

    print_warning "This will resize the image to: $new_size"
    print_warning "Note: You will need to resize the partition inside the VM"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi

    qemu-img resize "$IMAGE_DIR/$image" "$new_size"

    # Show new size
    echo ""
    echo "New virtual size:"
    qemu-img info "$IMAGE_DIR/$image" | grep "virtual size"

    print_success "Image resized successfully"
}

# Clone image
clone_image() {
    local source="$1"
    local destination="$2"

    if [ -z "$source" ] || [ -z "$destination" ]; then
        print_error "Usage: $0 clone <source-image> <destination-image>"
        exit 1
    fi

    print_header "Cloning image"

    if [ ! -f "$IMAGE_DIR/$source" ]; then
        print_error "Source image not found: $IMAGE_DIR/$source"
        exit 1
    fi

    if [ -f "$IMAGE_DIR/$destination" ]; then
        print_error "Destination already exists: $IMAGE_DIR/$destination"
        exit 1
    fi

    echo "Creating linked clone (Copy-on-Write)..."
    qemu-img create -f qcow2 -F qcow2 -b "$IMAGE_DIR/$source" "$IMAGE_DIR/$destination"

    print_success "Image cloned successfully"

    # Show info
    echo ""
    qemu-img info "$IMAGE_DIR/$destination"
}

# Show usage
show_usage() {
    cat << EOF
VM Image Management Helper

Usage: $0 <command> [options]

Commands:
  list                          List all VM images
  snapshot <image> <name>       Create a snapshot
  restore <image> <name>        Restore a snapshot
  delete-snapshot <image> <name> Delete a snapshot
  compact <image>               Compact image (reduce disk usage)
  resize <image> <size>         Resize image (e.g., 100G)
  clone <source> <dest>         Clone image (CoW)

Examples:
  $0 list
  $0 snapshot windows11.qcow2 clean_install
  $0 restore windows11.qcow2 clean_install
  $0 compact windows11.qcow2
  $0 resize windows11.qcow2 100G
  $0 clone windows11.qcow2 windows11-dev.qcow2

Image directory: $IMAGE_DIR
EOF
}

# Main
case "$1" in
    list)
        list_images
        ;;
    snapshot)
        create_snapshot "$2" "$3"
        ;;
    restore)
        restore_snapshot "$2" "$3"
        ;;
    delete-snapshot)
        delete_snapshot "$2" "$3"
        ;;
    compact)
        compact_image "$2"
        ;;
    resize)
        resize_image "$2" "$3"
        ;;
    clone)
        clone_image "$2" "$3"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
