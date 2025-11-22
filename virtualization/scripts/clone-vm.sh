#!/bin/bash
#
# Clone VM from base template
#
# Usage: ./clone-vm.sh <name> <cpus> <ram>
# Example: ./clone-vm.sh browser-1 2 4G
#

set -e

BASE_VM="antidetect-base"
NAME="${1:-browser-$(date +%s)}"
CPUS="${2:-2}"
RAM="${3:-4G}"

echo "Cloning $BASE_VM to $NAME..."
echo "CPUs: $CPUS, RAM: $RAM"

# Clone VM
sudo virt-clone \
    --original "$BASE_VM" \
    --name "$NAME" \
    --auto-clone

# Customize resources
virsh setvcpus "$NAME" "$CPUS" --config --maximum
virsh setvcpus "$NAME" "$CPUS" --config
virsh setmaxmem "$NAME" "$RAM" --config
virsh setmem "$NAME" "$RAM" --config

# Generate new MAC address
NEW_MAC="52:54:00:$(openssl rand -hex 3 | sed 's/\(..\)/\1:/g; s/:$//')"
virsh detach-interface "$NAME" network --config
virsh attach-interface "$NAME" network default --model virtio --mac "$NEW_MAC" --config

echo "✓ VM $NAME created successfully"
echo "Start with: virsh start $NAME"
