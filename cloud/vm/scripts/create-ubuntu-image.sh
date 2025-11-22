#!/bin/bash
# Create Ubuntu VM Image
# Session 6: Hardware Virtualization Setup

set -e

# Configuration
UBUNTU_VERSION="${1:-22.04}"
IMAGE_NAME="ubuntu-${UBUNTU_VERSION}.qcow2"
IMAGE_SIZE="40G"
IMAGE_DIR="/var/lib/undetect-browser/vm/images"
ISO_PATH="${2:-ubuntu-${UBUNTU_VERSION}-desktop-amd64.iso}"
VNC_PORT="${3:-5902}"

echo "================================================"
echo "Creating Ubuntu $UBUNTU_VERSION VM Image"
echo "================================================"
echo "Image: $IMAGE_DIR/$IMAGE_NAME"
echo "Size: $IMAGE_SIZE"
echo "ISO: $ISO_PATH"
echo "VNC Port: $VNC_PORT"
echo "================================================"

# Create image directory
mkdir -p "$IMAGE_DIR"

# Check if ISO exists
if [ ! -f "$ISO_PATH" ]; then
    echo "ERROR: ISO file not found: $ISO_PATH"
    echo ""
    echo "You can download Ubuntu from:"
    echo "https://ubuntu.com/download/desktop"
    echo ""
    echo "Usage: $0 [ubuntu-version] [path-to-iso] [vnc-port]"
    echo "Example: $0 22.04 /path/to/ubuntu-22.04-desktop-amd64.iso 5902"
    exit 1
fi

# Check if image already exists
if [ -f "$IMAGE_DIR/$IMAGE_NAME" ]; then
    echo "WARNING: Image already exists: $IMAGE_DIR/$IMAGE_NAME"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -f "$IMAGE_DIR/$IMAGE_NAME"
fi

# Create QCOW2 image
echo "Creating QCOW2 image..."
qemu-img create -f qcow2 "$IMAGE_DIR/$IMAGE_NAME" "$IMAGE_SIZE"

# Start QEMU installation
echo "Starting QEMU for Ubuntu installation..."
echo "Connect via VNC to localhost:$VNC_PORT"
echo "Press Ctrl+C when installation is complete"

qemu-system-x86_64 \
    -enable-kvm \
    -cpu host \
    -smp 4,cores=4 \
    -m 4G \
    -machine q35 \
    -cdrom "$ISO_PATH" \
    -drive file="$IMAGE_DIR/$IMAGE_NAME",format=qcow2,if=virtio \
    -net nic,model=virtio \
    -net user \
    -device virtio-vga \
    -vnc ":$(($VNC_PORT - 5900))" \
    -boot d

echo ""
echo "================================================"
echo "Installation complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Create a clean snapshot:"
echo "   qemu-img snapshot -c clean_install $IMAGE_DIR/$IMAGE_NAME"
echo ""
echo "2. Compact the image:"
echo "   qemu-img convert -O qcow2 -c $IMAGE_DIR/$IMAGE_NAME $IMAGE_DIR/${IMAGE_NAME}.compact"
echo "   mv $IMAGE_DIR/${IMAGE_NAME}.compact $IMAGE_DIR/$IMAGE_NAME"
echo ""
echo "3. Get image info:"
echo "   qemu-img info $IMAGE_DIR/$IMAGE_NAME"
echo "================================================"
