/**
 * Advanced WebRTC Spoofing Module
 *
 * IMPORTANT: Instead of blocking WebRTC completely (which looks suspicious),
 * this module SPOOFS WebRTC data to show proxy IP instead of real IP.
 *
 * This makes the fingerprint look more natural - websites see a working WebRTC,
 * but all IP data points to the proxy, not your real IP.
 *
 * Features:
 * - ✅ WebRTC works normally (no red flags)
 * - ✅ All IPs show proxy IP (local and public)
 * - ✅ ICE candidates substitution
 * - ✅ STUN/TURN server control
 * - ✅ Flexible configuration (block, spoof, or custom)
 */

import { Page } from 'puppeteer';

/**
 * WebRTC spoofing modes
 */
export type WebRTCMode = 'disable' | 'spoof' | 'custom';

/**
 * WebRTC spoofing configuration
 */
export interface WebRTCSpoofConfig {
  /** Mode: disable (block completely), spoof (substitute IPs), custom (use provided IPs) */
  mode: WebRTCMode;

  /** Public IP to show (usually proxy IP) */
  publicIP?: string;

  /** Local IP to show (usually proxy IP or fake local) */
  localIP?: string;

  /** Custom STUN servers (optional) */
  stunServers?: string[];

  /** Whether to allow WebRTC at all */
  enabled?: boolean;

  /** Substitute all IPs with proxy IP */
  substituteAllIPs?: boolean;
}

/**
 * Default WebRTC configuration for maximum stealth
 */
export const DEFAULT_WEBRTC_CONFIG: WebRTCSpoofConfig = {
  mode: 'spoof',
  enabled: true,
  substituteAllIPs: true,
  // IPs will be set automatically from proxy
};

/**
 * Apply advanced WebRTC spoofing to a page
 *
 * This is the RECOMMENDED approach - it makes WebRTC work but shows only proxy data
 */
export async function applyWebRTCSpoofing(
  page: Page,
  config: WebRTCSpoofConfig
): Promise<void> {
  await page.evaluateOnNewDocument((spoofConfig: WebRTCSpoofConfig) => {
    // ============================================================================
    // MODE 1: DISABLE - Complete blocking (looks suspicious, not recommended)
    // ============================================================================
    if (spoofConfig.mode === 'disable' || !spoofConfig.enabled) {
      (window as any).RTCPeerConnection = undefined;
      (window as any).webkitRTCPeerConnection = undefined;
      (window as any).mozRTCPeerConnection = undefined;
      console.log('[WebRTC] ❌ Completely disabled (not recommended - suspicious)');
      return;
    }

    // ============================================================================
    // MODE 2: SPOOF - Substitute IPs (RECOMMENDED for stealth)
    // ============================================================================
    if (spoofConfig.mode === 'spoof' || spoofConfig.mode === 'custom') {
      const publicIP = spoofConfig.publicIP || '1.2.3.4'; // Will be replaced with actual proxy IP
      const localIP = spoofConfig.localIP || '192.168.1.100'; // Fake local IP

      console.log(`[WebRTC] ✅ Spoofing enabled - Public: ${publicIP}, Local: ${localIP}`);

      // Save original RTCPeerConnection
      const OriginalRTCPeerConnection = window.RTCPeerConnection ||
                                         (window as any).webkitRTCPeerConnection ||
                                         (window as any).mozRTCPeerConnection;

      if (!OriginalRTCPeerConnection) {
        console.log('[WebRTC] ⚠️ RTCPeerConnection not available');
        return;
      }

      // Create spoofed RTCPeerConnection
      const SpoofedRTCPeerConnection = function (
        this: RTCPeerConnection,
        config?: RTCConfiguration
      ) {
        // Modify ICE servers if needed
        const modifiedConfig = config ? { ...config } : {};

        // Use custom STUN servers if provided
        if (spoofConfig.stunServers && spoofConfig.stunServers.length > 0) {
          modifiedConfig.iceServers = spoofConfig.stunServers.map((url) => ({ urls: url }));
        }

        // Create original connection
        const pc = new OriginalRTCPeerConnection(modifiedConfig);

        // ================================================================
        // CRITICAL: Intercept ICE candidates and substitute IPs
        // ================================================================
        const originalAddEventListener = pc.addEventListener.bind(pc);
        pc.addEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) {
          if (type === 'icecandidate') {
            // Wrap the listener to modify candidates
            const wrappedListener = function (event: RTCPeerConnectionIceEvent) {
              if (event.candidate && event.candidate.candidate) {
                const originalCandidate = event.candidate.candidate;

                // Substitute IPs in the candidate string
                let modifiedCandidate = originalCandidate;

                if (spoofConfig.substituteAllIPs) {
                  // Replace any IP address with proxy IP
                  // ICE candidate format: "candidate:... typ host/srflx/relay raddr ... rport ..."

                  // Replace IPv4 addresses
                  modifiedCandidate = modifiedCandidate.replace(
                    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
                    (match) => {
                      // Check if it's a private IP
                      if (
                        match.startsWith('192.168.') ||
                        match.startsWith('10.') ||
                        match.startsWith('172.16.') ||
                        match.startsWith('172.17.') ||
                        match.startsWith('172.18.') ||
                        match.startsWith('172.19.') ||
                        match.startsWith('172.2') ||
                        match.startsWith('172.30.') ||
                        match.startsWith('172.31.') ||
                        match.startsWith('127.')
                      ) {
                        // Replace private IPs with fake local IP
                        return localIP;
                      } else {
                        // Replace public IPs with proxy IP
                        return publicIP;
                      }
                    }
                  );

                  // Replace IPv6 addresses with fake ones
                  modifiedCandidate = modifiedCandidate.replace(
                    /\b([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\b/g,
                    '::1'
                  );
                }

                // Create modified event
                const modifiedEvent = new RTCPeerConnectionIceEvent('icecandidate', {
                  candidate: new RTCIceCandidate({
                    ...event.candidate.toJSON(),
                    candidate: modifiedCandidate,
                  }),
                });

                // Call original listener with modified event
                if (typeof listener === 'function') {
                  listener.call(this, modifiedEvent);
                } else if (listener && typeof listener.handleEvent === 'function') {
                  listener.handleEvent(modifiedEvent);
                }

                console.log(`[WebRTC] 🔄 Substituted candidate IPs`);
                console.log(`  Original: ${originalCandidate}`);
                console.log(`  Modified: ${modifiedCandidate}`);
              } else {
                // No candidate (end of candidates) - pass through
                if (typeof listener === 'function') {
                  listener.call(this, event);
                } else if (listener && typeof listener.handleEvent === 'function') {
                  listener.handleEvent(event);
                }
              }
            };

            return originalAddEventListener.call(pc, type, wrappedListener as any, options);
          }

          // For other events, pass through normally
          return originalAddEventListener.call(pc, type, listener, options);
        };

        // Also handle onicecandidate property
        let _onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
        Object.defineProperty(pc, 'onicecandidate', {
          get: () => _onicecandidate,
          set: (handler: ((event: RTCPeerConnectionIceEvent) => void) | null) => {
            _onicecandidate = handler;
            if (handler) {
              pc.addEventListener('icecandidate', handler as any);
            }
          },
        });

        // ================================================================
        // Intercept getStats to modify reported IPs
        // ================================================================
        const originalGetStats = pc.getStats.bind(pc);
        pc.getStats = async function (...args: any[]): Promise<RTCStatsReport> {
          const stats = await originalGetStats(...args);

          // Modify stats to show proxy IPs
          const modifiedStats = new Map<string, any>(stats);

          stats.forEach((stat: any, key: string) => {
            if (stat.type === 'local-candidate' || stat.type === 'remote-candidate') {
              const modifiedStat = { ...stat };

              // Replace IP addresses in candidates
              if (modifiedStat.address) {
                if (modifiedStat.address.startsWith('192.168.') ||
                    modifiedStat.address.startsWith('10.') ||
                    modifiedStat.address.startsWith('172.')) {
                  modifiedStat.address = localIP;
                } else {
                  modifiedStat.address = publicIP;
                }
              }

              if (modifiedStat.ip) {
                if (modifiedStat.ip.startsWith('192.168.') ||
                    modifiedStat.ip.startsWith('10.') ||
                    modifiedStat.ip.startsWith('172.')) {
                  modifiedStat.ip = localIP;
                } else {
                  modifiedStat.ip = publicIP;
                }
              }

              modifiedStats.set(key, modifiedStat);
            }
          });

          return modifiedStats as any as RTCStatsReport;
        };

        return pc;
      };

      // Replace RTCPeerConnection with spoofed version
      (SpoofedRTCPeerConnection as any).prototype = OriginalRTCPeerConnection.prototype;

      (window as any).RTCPeerConnection = SpoofedRTCPeerConnection;
      (window as any).webkitRTCPeerConnection = SpoofedRTCPeerConnection;
      (window as any).mozRTCPeerConnection = SpoofedRTCPeerConnection;

      console.log('[WebRTC] ✅ Advanced spoofing applied - WebRTC works but shows proxy IPs only');
    }

    // ============================================================================
    // ADDITIONAL PROTECTIONS
    // ============================================================================

    // Override getUserMedia to prevent camera/microphone detection
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      );

      navigator.mediaDevices.getUserMedia = function (_constraints?: MediaStreamConstraints) {
        console.log('[WebRTC] 🎥 getUserMedia called - returning empty stream');

        // Return a fake stream instead of blocking completely
        // This looks more natural
        return originalGetUserMedia({ audio: false, video: false });
      };
    }

    // Override enumerateDevices to show fake devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      // Store original but don't use it to avoid suspicion
      // const _originalEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(
      //   navigator.mediaDevices
      // );

      navigator.mediaDevices.enumerateDevices = async function () {
        console.log('[WebRTC] 🎤 enumerateDevices called - returning fake devices');

        // Return fake devices to look natural
        const fakeDevices: MediaDeviceInfo[] = [
          {
            deviceId: 'default',
            kind: 'audioinput',
            label: 'Default - Microphone',
            groupId: 'default-group',
            toJSON: () => ({}),
          } as MediaDeviceInfo,
          {
            deviceId: 'default',
            kind: 'audiooutput',
            label: 'Default - Speaker',
            groupId: 'default-group',
            toJSON: () => ({}),
          } as MediaDeviceInfo,
          {
            deviceId: 'default',
            kind: 'videoinput',
            label: 'Default - Camera',
            groupId: 'default-group',
            toJSON: () => ({}),
          } as MediaDeviceInfo,
        ];

        return Promise.resolve(fakeDevices);
      };
    }
  }, config);
}

/**
 * Create WebRTC configuration from proxy settings
 */
export function createWebRTCConfigFromProxy(proxyIP?: string): WebRTCSpoofConfig {
  if (!proxyIP) {
    return DEFAULT_WEBRTC_CONFIG;
  }

  // Generate a fake local IP based on proxy IP
  // This makes it look consistent
  const ipParts = proxyIP.split('.');
  const fakeLocalIP = `192.168.${parseInt(ipParts[2]) % 255}.${parseInt(ipParts[3]) % 255}`;

  return {
    mode: 'spoof',
    enabled: true,
    publicIP: proxyIP,
    localIP: fakeLocalIP,
    substituteAllIPs: true,
    stunServers: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ],
  };
}

/**
 * Test WebRTC spoofing
 * Returns what IPs WebRTC would reveal
 */
export async function testWebRTCSpoofing(page: Page): Promise<{
  localIPs: string[];
  publicIPs: string[];
  working: boolean;
}> {
  const result = await page.evaluate(() => {
    return new Promise<{ localIPs: string[]; publicIPs: string[]; working: boolean }>(
      (resolve) => {
        const localIPs: string[] = [];
        const publicIPs: string[] = [];

        try {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });

          pc.createDataChannel('');

          pc.onicecandidate = (event) => {
            if (!event.candidate) {
              // End of candidates
              pc.close();
              resolve({ localIPs, publicIPs, working: true });
              return;
            }

            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);

            if (ipMatch) {
              const ip = ipMatch[0];

              if (
                ip.startsWith('192.168.') ||
                ip.startsWith('10.') ||
                ip.startsWith('172.')
              ) {
                if (!localIPs.includes(ip)) {
                  localIPs.push(ip);
                }
              } else {
                if (!publicIPs.includes(ip)) {
                  publicIPs.push(ip);
                }
              }
            }
          };

          void pc.createOffer().then((offer) => pc.setLocalDescription(offer));

          // Timeout after 5 seconds
          setTimeout(() => {
            pc.close();
            resolve({ localIPs, publicIPs, working: localIPs.length > 0 || publicIPs.length > 0 });
          }, 5000);
        } catch (_error) {
          resolve({ localIPs: [], publicIPs: [], working: false });
        }
      }
    );
  });

  return result;
}

/**
 * Verify WebRTC is properly spoofed
 */
export async function verifyWebRTCSpoofing(
  page: Page,
  expectedProxyIP: string
): Promise<{
  success: boolean;
  issues: string[];
  ips: { local: string[]; public: string[] };
}> {
  const test = await testWebRTCSpoofing(page);
  const issues: string[] = [];

  // Check if WebRTC is working
  if (!test.working) {
    issues.push('WebRTC is not working (might look suspicious)');
  }

  // Check if any real IPs are leaking (public IPs that don't match proxy)
  const hasRealPublicIP = test.publicIPs.some((ip) => ip !== expectedProxyIP);

  if (hasRealPublicIP) {
    issues.push(`Public IP leak detected: ${test.publicIPs.join(', ')}`);
  }

  // Check if proxy IP is shown
  const showsProxyIP =
    test.publicIPs.includes(expectedProxyIP) || test.localIPs.includes(expectedProxyIP);

  if (!showsProxyIP && test.working) {
    issues.push(`Proxy IP ${expectedProxyIP} not visible in WebRTC`);
  }

  return {
    success: issues.length === 0 && test.working,
    issues,
    ips: {
      local: test.localIPs,
      public: test.publicIPs,
    },
  };
}

/**
 * Get recommended WebRTC configuration based on threat model
 */
export function getRecommendedWebRTCConfig(threatLevel: 'low' | 'medium' | 'high'): WebRTCSpoofConfig {
  switch (threatLevel) {
    case 'low':
      // Low threat: Let WebRTC work normally with spoofed IPs
      return {
        mode: 'spoof',
        enabled: true,
        substituteAllIPs: true,
      };

    case 'medium':
      // Medium threat: Spoof IPs and use custom STUN servers
      return {
        mode: 'spoof',
        enabled: true,
        substituteAllIPs: true,
        stunServers: ['stun:stun.l.google.com:19302'],
      };

    case 'high':
      // High threat: Disable WebRTC completely
      // Note: This might look suspicious on some sites
      return {
        mode: 'disable',
        enabled: false,
      };

    default:
      return DEFAULT_WEBRTC_CONFIG;
  }
}
