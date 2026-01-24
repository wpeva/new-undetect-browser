/**
 * Network Isolation Manager (macvlan/bridge)
 * Session 6: Hardware Virtualization Setup
 *
 * Manages network isolation for VMs using macvlan, bridge, and firewall rules
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { NetworkIsolationConfig, NetworkConfig } from '../types';

const execAsync = promisify(exec);

export class NetworkIsolationManager {
  /**
   * Check network capabilities
   */
  async checkCapabilities(): Promise<{
    bridgeSupport: boolean;
    macvlanSupport: boolean;
    ipvlanSupport: boolean;
    iptablesAvailable: boolean;
    interfaces: string[];
  }> {
    let bridgeSupport = false;
    let macvlanSupport = false;
    let ipvlanSupport = false;
    let iptablesAvailable = false;

    // Check for bridge-utils
    try {
      await execAsync('which brctl');
      bridgeSupport = true;
    } catch {
      // bridge-utils not installed
    }

    // Check for macvlan kernel module
    try {
      await execAsync('modinfo macvlan');
      macvlanSupport = true;
    } catch {
      // macvlan not available
    }

    // Check for ipvlan kernel module
    try {
      await execAsync('modinfo ipvlan');
      ipvlanSupport = true;
    } catch {
      // ipvlan not available
    }

    // Check for iptables
    try {
      await execAsync('which iptables');
      iptablesAvailable = true;
    } catch {
      // iptables not installed
    }

    // List network interfaces
    const interfaces = await this.listInterfaces();

    return {
      bridgeSupport,
      macvlanSupport,
      ipvlanSupport,
      iptablesAvailable,
      interfaces
    };
  }

  /**
   * List network interfaces
   */
  async listInterfaces(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('ip -o link show');
      const lines = stdout.split('\n').filter(Boolean);

      return lines.map(line => {
        const match = line.match(/^\d+:\s+(\S+):/);
        return match ? match[1] : null;
      }).filter(Boolean) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Create macvlan interface
   */
  async createMacvlan(options: {
    name: string;
    parent: string;
    mode: 'private' | 'vepa' | 'bridge' | 'passthru';
    macAddress?: string;
  }): Promise<void> {
    const { name, parent, mode, macAddress } = options;

    console.log(`Creating macvlan interface ${name} on ${parent} (mode: ${mode})`);

    // Create macvlan interface
    await execAsync(
      `ip link add link ${parent} name ${name} type macvlan mode ${mode}`
    );

    // Set MAC address if provided
    if (macAddress) {
      await execAsync(`ip link set ${name} address ${macAddress}`);
    }

    // Bring interface up
    await execAsync(`ip link set ${name} up`);

    console.log(`Macvlan interface ${name} created successfully`);
  }

  /**
   * Delete macvlan interface
   */
  async deleteMacvlan(name: string): Promise<void> {
    console.log(`Deleting macvlan interface ${name}`);

    try {
      await execAsync(`ip link delete ${name}`);
      console.log(`Macvlan interface ${name} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete macvlan interface ${name}:`, error);
      throw error;
    }
  }

  /**
   * Create bridge interface
   */
  async createBridge(options: {
    name: string;
    ipAddress?: string;
    netmask?: string;
  }): Promise<void> {
    const { name, ipAddress, netmask } = options;

    console.log(`Creating bridge interface ${name}`);

    // Create bridge
    await execAsync(`ip link add name ${name} type bridge`);

    // Set IP address if provided
    if (ipAddress && netmask) {
      await execAsync(`ip addr add ${ipAddress}/${netmask} dev ${name}`);
    }

    // Bring interface up
    await execAsync(`ip link set ${name} up`);

    console.log(`Bridge interface ${name} created successfully`);
  }

  /**
   * Delete bridge interface
   */
  async deleteBridge(name: string): Promise<void> {
    console.log(`Deleting bridge interface ${name}`);

    try {
      await execAsync(`ip link set ${name} down`);
      await execAsync(`ip link delete ${name} type bridge`);
      console.log(`Bridge interface ${name} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete bridge interface ${name}:`, error);
      throw error;
    }
  }

  /**
   * Create TAP interface for VM
   */
  async createTapInterface(options: {
    name: string;
    bridge?: string;
    user?: string;
  }): Promise<void> {
    const { name, bridge, user } = options;

    console.log(`Creating TAP interface ${name}`);

    // Create TAP interface
    let cmd = `ip tuntap add dev ${name} mode tap`;
    if (user) {
      cmd += ` user ${user}`;
    }
    await execAsync(cmd);

    // Bring interface up
    await execAsync(`ip link set ${name} up`);

    // Add to bridge if specified
    if (bridge) {
      await execAsync(`ip link set ${name} master ${bridge}`);
    }

    console.log(`TAP interface ${name} created successfully`);
  }

  /**
   * Delete TAP interface
   */
  async deleteTapInterface(name: string): Promise<void> {
    console.log(`Deleting TAP interface ${name}`);

    try {
      await execAsync(`ip link delete ${name}`);
      console.log(`TAP interface ${name} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete TAP interface ${name}:`, error);
      throw error;
    }
  }

  /**
   * Configure firewall rules for VM isolation
   */
  async configureFirewall(config: {
    iface: string;
    allowedPorts?: number[];
    blockedIPs?: string[];
    rateLimiting?: boolean;
    dropInvalid?: boolean;
  }): Promise<void> {
    const { iface, allowedPorts, blockedIPs, rateLimiting, dropInvalid } = config;

    console.log(`Configuring firewall for interface ${iface}`);

    // Create chain for VM
    const chainName = `VM_${iface.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

    try {
      // Create chain
      await execAsync(`iptables -N ${chainName}`);
    } catch {
      // Chain might already exist, flush it
      await execAsync(`iptables -F ${chainName}`);
    }

    // Drop invalid packets
    if (dropInvalid) {
      await execAsync(`iptables -A ${chainName} -m state --state INVALID -j DROP`);
    }

    // Allow established connections
    await execAsync(
      `iptables -A ${chainName} -m state --state ESTABLISHED,RELATED -j ACCEPT`
    );

    // Block specific IPs
    if (blockedIPs && blockedIPs.length > 0) {
      for (const ip of blockedIPs) {
        await execAsync(`iptables -A ${chainName} -s ${ip} -j DROP`);
        await execAsync(`iptables -A ${chainName} -d ${ip} -j DROP`);
      }
    }

    // Rate limiting
    if (rateLimiting) {
      await execAsync(
        `iptables -A ${chainName} -m limit --limit 100/sec --limit-burst 200 -j ACCEPT`
      );
      await execAsync(`iptables -A ${chainName} -j DROP`);
    }

    // Allow specific ports
    if (allowedPorts && allowedPorts.length > 0) {
      for (const port of allowedPorts) {
        await execAsync(
          `iptables -A ${chainName} -p tcp --dport ${port} -j ACCEPT`
        );
        await execAsync(
          `iptables -A ${chainName} -p udp --dport ${port} -j ACCEPT`
        );
      }
    }

    // Apply chain to interface
    await execAsync(`iptables -A FORWARD -i ${iface} -j ${chainName}`);
    await execAsync(`iptables -A FORWARD -o ${iface} -j ${chainName}`);

    console.log(`Firewall configured for interface ${iface}`);
  }

  /**
   * Remove firewall rules for interface
   */
  async removeFirewall(iface: string): Promise<void> {
    const chainName = `VM_${iface.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

    console.log(`Removing firewall rules for interface ${iface}`);

    try {
      // Remove rules referencing the chain
      await execAsync(`iptables -D FORWARD -i ${iface} -j ${chainName}`);
      await execAsync(`iptables -D FORWARD -o ${iface} -j ${chainName}`);

      // Flush and delete chain
      await execAsync(`iptables -F ${chainName}`);
      await execAsync(`iptables -X ${chainName}`);

      console.log(`Firewall rules removed for interface ${iface}`);
    } catch (error) {
      console.error(`Failed to remove firewall rules:`, error);
    }
  }

  /**
   * Configure DNS isolation
   */
  async configureDNS(config: {
    iface: string;
    customDNS?: string[];
    blockDNSLeaks?: boolean;
  }): Promise<void> {
    const { iface, customDNS, blockDNSLeaks } = config;

    console.log(`Configuring DNS for interface ${iface}`);

    if (blockDNSLeaks) {
      // Block all DNS queries except to specified servers
      await execAsync(`iptables -A OUTPUT -o ${iface} -p udp --dport 53 -j DROP`);
      await execAsync(`iptables -A OUTPUT -o ${iface} -p tcp --dport 53 -j DROP`);

      if (customDNS && customDNS.length > 0) {
        for (const dns of customDNS) {
          await execAsync(
            `iptables -I OUTPUT -o ${iface} -p udp -d ${dns} --dport 53 -j ACCEPT`
          );
          await execAsync(
            `iptables -I OUTPUT -o ${iface} -p tcp -d ${dns} --dport 53 -j ACCEPT`
          );
        }
      }
    }

    console.log(`DNS configured for interface ${iface}`);
  }

  /**
   * Setup complete network isolation
   */
  async setupIsolation(
    vmId: string,
    config: NetworkIsolationConfig
  ): Promise<{
    iface: string;
    tapDevice: string;
  }> {
    if (!config.enabled) {
      throw new Error('Network isolation is not enabled');
    }

    const tapDevice = `tap-${vmId.substring(0, 8)}`;
    let networkInterface: string;

    switch (config.mode) {
      case 'macvlan':
        if (!config.parentInterface) {
          throw new Error('Parent interface required for macvlan mode');
        }

        networkInterface = `macvlan-${vmId.substring(0, 8)}`;

        await this.createMacvlan({
          name: networkInterface,
          parent: config.parentInterface,
          mode: config.macvlanMode || 'bridge'
        });

        // Create TAP device and attach to macvlan
        await this.createTapInterface({
          name: tapDevice
        });

        break;

      case 'bridge':
        // Create or use existing bridge
        networkInterface = 'virbr0'; // Default libvirt bridge

        // Create TAP device and attach to bridge
        await this.createTapInterface({
          name: tapDevice,
          bridge: networkInterface
        });

        break;

      case 'ipvlan':
        if (!config.parentInterface) {
          throw new Error('Parent interface required for ipvlan mode');
        }

        networkInterface = `ipvlan-${vmId.substring(0, 8)}`;

        // Create ipvlan interface
        await execAsync(
          `ip link add link ${config.parentInterface} name ${networkInterface} type ipvlan mode l2`
        );
        await execAsync(`ip link set ${networkInterface} up`);

        // Create TAP device
        await this.createTapInterface({
          name: tapDevice
        });

        break;

      default:
        throw new Error(`Unsupported network mode: ${config.mode}`);
    }

    // Configure firewall if enabled
    if (config.firewall?.enabled) {
      await this.configureFirewall({
        interface: tapDevice,
        allowedPorts: config.firewall.allowedPorts,
        blockedIPs: config.firewall.blockedIPs,
        rateLimiting: config.firewall.rateLimiting,
        dropInvalid: true
      });
    }

    // Configure DNS isolation
    if (config.customDNS || config.blockDNSLeaks) {
      await this.configureDNS({
        interface: tapDevice,
        customDNS: config.customDNS,
        blockDNSLeaks: config.blockDNSLeaks
      });
    }

    console.log(`Network isolation configured for VM ${vmId}`);

    return {
      interface: networkInterface,
      tapDevice
    };
  }

  /**
   * Teardown network isolation
   */
  async teardownIsolation(
    vmId: string,
    config: NetworkIsolationConfig
  ): Promise<void> {
    const tapDevice = `tap-${vmId.substring(0, 8)}`;
    const networkInterface = `${config.mode}-${vmId.substring(0, 8)}`;

    console.log(`Tearing down network isolation for VM ${vmId}`);

    // Remove firewall rules
    if (config.firewall?.enabled) {
      await this.removeFirewall(tapDevice);
    }

    // Delete TAP device
    try {
      await this.deleteTapInterface(tapDevice);
    } catch {
      // May not exist
    }

    // Delete network interface (macvlan/ipvlan)
    if (config.mode === 'macvlan') {
      try {
        await this.deleteMacvlan(networkInterface);
      } catch {
        // May not exist
      }
    } else if (config.mode === 'ipvlan') {
      try {
        await execAsync(`ip link delete ${networkInterface}`);
      } catch {
        // May not exist
      }
    }

    console.log(`Network isolation torn down for VM ${vmId}`);
  }

  /**
   * Generate network isolation script
   */
  async generateSetupScript(vmId: string, config: NetworkIsolationConfig): Promise<string> {
    const tapDevice = `tap-${vmId.substring(0, 8)}`;
    const networkInterface = `${config.mode}-${vmId.substring(0, 8)}`;

    let script = `#!/bin/bash
# Network Isolation Setup Script
# Generated for VM: ${vmId}
# Mode: ${config.mode}

set -e

echo "Setting up network isolation for VM ${vmId}..."

`;

    if (config.mode === 'macvlan') {
      script += `
# Create macvlan interface
ip link add link ${config.parentInterface} name ${networkInterface} type macvlan mode ${config.macvlanMode || 'bridge'}
ip link set ${networkInterface} up

`;
    } else if (config.mode === 'bridge') {
      script += `
# Use existing bridge
BRIDGE="${networkInterface}"

`;
    }

    script += `
# Create TAP device
ip tuntap add dev ${tapDevice} mode tap
ip link set ${tapDevice} up

`;

    if (config.mode === 'bridge') {
      script += `
# Attach TAP to bridge
ip link set ${tapDevice} master $BRIDGE

`;
    }

    if (config.firewall?.enabled) {
      script += `
# Configure firewall
CHAIN="VM_${tapDevice.toUpperCase().replace(/[^A-Z0-9]/g, '_')}"
iptables -N $CHAIN || iptables -F $CHAIN
iptables -A $CHAIN -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -i ${tapDevice} -j $CHAIN
iptables -A FORWARD -o ${tapDevice} -j $CHAIN

`;
    }

    script += `
echo "Network isolation setup complete!"
echo "TAP device: ${tapDevice}"
echo "Network interface: ${networkInterface}"
`;

    return script;
  }
}

export default NetworkIsolationManager;
