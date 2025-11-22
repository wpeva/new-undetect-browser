#!/bin/bash
#
# Create Base VM for Anti-Detect Browser
#
# This script creates a base Ubuntu VM with all dependencies installed.
# The VM will be used as a template for cloning browser instances.
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
VM_NAME="antidetect-base"
VM_CPUS=2
VM_RAM=4096  # MB
VM_DISK=50   # GB
ISO_URL="https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso"
ISO_PATH="/var/lib/libvirt/images/ubuntu-22.04.iso"
DISK_PATH="/var/lib/libvirt/images/${VM_NAME}.qcow2"

echo -e "${GREEN}=== Creating Anti-Detect Base VM ===${NC}"
echo "VM Name: $VM_NAME"
echo "CPUs: $VM_CPUS"
echo "RAM: ${VM_RAM}MB"
echo "Disk: ${VM_DISK}GB"
echo ""

# Check if KVM is available
if ! kvm-ok > /dev/null 2>&1; then
    echo -e "${RED}ERROR: KVM is not available${NC}"
    echo "Please ensure:"
    echo "  1. CPU supports virtualization (Intel VT-x or AMD-V)"
    echo "  2. Virtualization is enabled in BIOS"
    echo "  3. KVM modules are loaded"
    exit 1
fi

# Check if libvirt is running
if ! systemctl is-active --quiet libvirtd; then
    echo -e "${YELLOW}Starting libvirtd...${NC}"
    sudo systemctl start libvirtd
fi

# Download Ubuntu ISO if not present
if [ ! -f "$ISO_PATH" ]; then
    echo -e "${YELLOW}Downloading Ubuntu 22.04 ISO...${NC}"
    sudo wget -O "$ISO_PATH" "$ISO_URL"
else
    echo -e "${GREEN}ISO already downloaded${NC}"
fi

# Create disk image
if [ -f "$DISK_PATH" ]; then
    echo -e "${YELLOW}Disk image already exists. Remove it? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        sudo rm "$DISK_PATH"
    else
        echo "Aborting"
        exit 1
    fi
fi

echo -e "${GREEN}Creating disk image...${NC}"
sudo qemu-img create -f qcow2 "$DISK_PATH" "${VM_DISK}G"

# Create cloud-init config
CLOUD_INIT_DIR="/tmp/cloud-init-${VM_NAME}"
mkdir -p "$CLOUD_INIT_DIR"

cat > "${CLOUD_INIT_DIR}/user-data" << 'EOF'
#cloud-config
hostname: antidetect-base
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo, docker
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... # Add your SSH key here

packages:
  - docker.io
  - docker-compose
  - curl
  - wget
  - git
  - build-essential
  - chromium-browser
  - chromium-chromedriver
  - xvfb
  - libnss3
  - libxss1
  - libasound2
  - libatk-bridge2.0-0
  - libgtk-3-0

runcmd:
  # Enable Docker
  - systemctl enable docker
  - systemctl start docker

  # Install Node.js
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt-get install -y nodejs

  # Download anti-detect browser code
  - mkdir -p /opt/antidetect
  - cd /opt/antidetect
  # git clone https://github.com/your-repo/new-undetect-browser.git .

  # Install dependencies
  # npm ci

  # Build project
  # npm run build

  # Clean up
  - apt-get clean
  - rm -rf /var/lib/apt/lists/*

final_message: "Anti-Detect Base VM setup complete!"
EOF

cat > "${CLOUD_INIT_DIR}/meta-data" << EOF
instance-id: ${VM_NAME}
local-hostname: ${VM_NAME}
EOF

# Create cloud-init ISO
CLOUD_INIT_ISO="${CLOUD_INIT_DIR}/cloud-init.iso"
genisoimage -output "$CLOUD_INIT_ISO" \
    -volid cidata -joliet -rock \
    "${CLOUD_INIT_DIR}/user-data" "${CLOUD_INIT_DIR}/meta-data"

# Install VM
echo -e "${GREEN}Installing VM...${NC}"
sudo virt-install \
    --name "$VM_NAME" \
    --ram "$VM_RAM" \
    --vcpus "$VM_CPUS" \
    --disk path="$DISK_PATH",format=qcow2,bus=virtio,cache=writeback \
    --cdrom "$ISO_PATH" \
    --disk path="$CLOUD_INIT_ISO",device=cdrom \
    --os-variant ubuntu22.04 \
    --network network=default,model=virtio \
    --graphics vnc,listen=127.0.0.1 \
    --noautoconsole \
    --virt-type kvm \
    --features acpi=on,apic=on \
    --clock offset=utc

echo -e "${GREEN}VM created successfully!${NC}"
echo ""
echo "Installation is in progress. Monitor with:"
echo "  virt-viewer $VM_NAME"
echo ""
echo "Or connect via VNC:"
echo "  virsh vncdisplay $VM_NAME"
echo ""
echo "After installation completes:"
echo "  1. Wait for cloud-init to finish (~5-10 minutes)"
echo "  2. Shutdown the VM: virsh shutdown $VM_NAME"
echo "  3. Create snapshot: virsh snapshot-create-as $VM_NAME base-snapshot"
echo "  4. Clone VMs: ./clone-vm.sh browser-1 2 4G"

# Clean up
rm -rf "$CLOUD_INIT_DIR"

echo -e "${GREEN}Done!${NC}"
