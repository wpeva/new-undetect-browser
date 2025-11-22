#!/bin/bash
# Create Windows 11 VM Image
# Session 6: Hardware Virtualization Setup

set -e

# Configuration
IMAGE_NAME="windows11-23h2.qcow2"
IMAGE_SIZE="60G"
IMAGE_DIR="/var/lib/undetect-browser/vm/images"
ISO_PATH="${1:-Win11_English_x64.iso}"
VNC_PORT="${2:-5901}"

echo "================================================"
echo "Creating Windows 11 VM Image"
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
    echo "Usage: $0 <path-to-windows11.iso> [vnc-port]"
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

# Create TPM socket directory
TPM_DIR="/tmp/swtpm-win11"
mkdir -p "$TPM_DIR"

# Start TPM emulator (required for Windows 11)
echo "Starting TPM emulator..."
swtpm socket --tpmstate dir="$TPM_DIR" \
    --ctrl type=unixio,path="$TPM_DIR/swtpm-sock" \
    --log level=20 \
    --tpm2 &
TPM_PID=$!

# Give TPM time to start
sleep 2

# Start QEMU installation
echo "Starting QEMU for Windows 11 installation..."
echo "Connect via VNC to localhost:$VNC_PORT"
echo "Press Ctrl+C when installation is complete"

qemu-system-x86_64 \
    -enable-kvm \
    -cpu host,hv_relaxed,hv_spinlocks=0x1fff,hv_vapic,hv_time \
    -smp 4,cores=4 \
    -m 8G \
    -machine q35,smm=on \
    -global driver=cfi.pflash01,property=secure,value=on \
    -drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE.fd \
    -drive if=pflash,format=raw,file=/usr/share/OVMF/OVMF_VARS.fd \
    -cdrom "$ISO_PATH" \
    -drive file="$IMAGE_DIR/$IMAGE_NAME",format=qcow2,if=virtio \
    -net nic,model=virtio \
    -net user \
    -chardev socket,id=chrtpm,path="$TPM_DIR/swtpm-sock" \
    -tpmdev emulator,id=tpm0,chardev=chrtpm \
    -device tpm-tis,tpmdev=tpm0 \
    -device virtio-vga \
    -vnc ":$(($VNC_PORT - 5900))" \
    -boot d

# Cleanup TPM on exit
kill $TPM_PID 2>/dev/null || true
rm -rf "$TPM_DIR"

echo ""
echo "================================================"
echo "Installation complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Create a clean snapshot:"
echo "   qemu-img snapshot -c clean_install $IMAGE_DIR/$IMAGE_NAME"
echo ""
echo "2. List snapshots:"
echo "   qemu-img snapshot -l $IMAGE_DIR/$IMAGE_NAME"
echo ""
echo "3. Restore snapshot:"
echo "   qemu-img snapshot -a clean_install $IMAGE_DIR/$IMAGE_NAME"
echo "================================================"
