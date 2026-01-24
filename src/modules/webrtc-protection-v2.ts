import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * WebRTC protection configuration
 */
export interface WebRTCProtectionConfig {
  enabled: boolean;
  blockPublicIP: boolean;
  blockLocalIP: boolean;
  spoofIP?: string;
  allowedIPs?: string[];
  mode: 'block' | 'spoof' | 'proxy';
}

/**
 * WebRTC leak detection result
 */
export interface WebRTCLeakDetection {
  leaksDetected: boolean;
  publicIPs: string[];
  localIPs: string[];
  ipv6Addresses: string[];
  timestamp: string;
}

/**
 * Enhanced WebRTC Protection Module v2
 * Complete WebRTC IP leak prevention and spoofing
 */
export class WebRTCProtectionV2 {
  private config: WebRTCProtectionConfig;

  constructor(config: Partial<WebRTCProtectionConfig> = {}) {
    this.config = {
      enabled: true,
      blockPublicIP: true,
      blockLocalIP: true,
      mode: 'block',
      ...config,
    };

    logger.info(
      `WebRTC Protection V2 initialized (mode: ${this.config.mode})`
    );
  }

  /**
   * Inject WebRTC protection into page
   */
  async inject(page: Page): Promise<void> {
    if (!this.config.enabled) {
      logger.info('WebRTC protection v2 disabled, skipping injection');
      return;
    }

    await page.evaluateOnNewDocument((config: WebRTCProtectionConfig) => {
      // Store original methods
      const originalRTCPeerConnection =
        window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!originalRTCPeerConnection) {
        logger.info('RTCPeerConnection not available, skipping WebRTC protection');
        return;
      }

      /**
       * Filter ICE candidates to prevent IP leaks
       */
      function filterICECandidate(candidate: string | null): string | null {
        if (!candidate) {return candidate;}

        // Parse candidate
        const parts = candidate.split(' ');
        if (parts.length < 5) {return candidate;}

        const ip = parts[4];

        // Check if IP should be blocked
        if (config.blockPublicIP && isPublicIP(ip)) {
          logger.debug(`Blocked public IP in ICE candidate: ${ip}`);
          return null;
        }

        if (config.blockLocalIP && isLocalIP(ip)) {
          logger.debug(`Blocked local IP in ICE candidate: ${ip}`);
          return null;
        }

        // Spoof IP if configured
        if (config.spoofIP && config.mode === 'spoof') {
          parts[4] = config.spoofIP;
          return parts.join(' ');
        }

        // Allow specific IPs
        if (config.allowedIPs && !config.allowedIPs.includes(ip)) {
          logger.debug(`Blocked non-allowed IP: ${ip}`);
          return null;
        }

        return candidate;
      }

      /**
       * Check if IP is public
       */
      function isPublicIP(ip: string): boolean {
        if (!ip || ip === '0.0.0.0') {return false;}

        // IPv6
        if (ip.includes(':')) {
          return !ip.startsWith('fe80:') && !ip.startsWith('fc00:');
        }

        // IPv4 private ranges
        const parts = ip.split('.');
        if (parts.length !== 4) {return false;}

        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);

        // 10.0.0.0/8
        if (first === 10) {return false;}
        // 172.16.0.0/12
        if (first === 172 && second >= 16 && second <= 31) {return false;}
        // 192.168.0.0/16
        if (first === 192 && second === 168) {return false;}
        // 127.0.0.0/8
        if (first === 127) {return false;}
        // 169.254.0.0/16
        if (first === 169 && second === 254) {return false;}

        return true;
      }

      /**
       * Check if IP is local
       */
      function isLocalIP(ip: string): boolean {
        if (!ip || ip === '0.0.0.0') {return true;}

        // IPv6 link-local
        if (ip.startsWith('fe80:') || ip.startsWith('fc00:')) {return true;}

        // IPv4
        const parts = ip.split('.');
        if (parts.length !== 4) {return false;}

        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);

        // Private ranges
        return (
          first === 10 ||
          (first === 172 && second >= 16 && second <= 31) ||
          (first === 192 && second === 168) ||
          first === 127 ||
          (first === 169 && second === 254)
        );
      }

      // Override RTCPeerConnection
      const ProtectedRTCPeerConnection = function (
        this: RTCPeerConnection,
        configuration?: RTCConfiguration,
        constraints?: any
      ) {
        // Modify configuration to prevent IP leaks
        const modifiedConfig = configuration || {};

        if (config.mode === 'block') {
          // Force relay-only mode
          modifiedConfig.iceTransportPolicy = 'relay';
        }

        // Create original connection
        const pc = new originalRTCPeerConnection(modifiedConfig, constraints);

        // Override addEventListener for 'icecandidate' events
        const originalAddEventListener = pc.addEventListener.bind(pc);
        pc.addEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ): void {
          if (type === 'icecandidate') {
            const wrappedListener =
              typeof listener === 'function'
                ? function (event: Event) {
                    const iceEvent = event as RTCPeerConnectionIceEvent;
                    if (iceEvent.candidate && iceEvent.candidate.candidate) {
                      const filtered = filterICECandidate(
                        iceEvent.candidate.candidate
                      );

                      if (!filtered) {
                        // Block this candidate
                        logger.debug('Blocked ICE candidate');
                        return;
                      }

                      // Create modified event
                      if (filtered !== iceEvent.candidate.candidate) {
                        const modifiedCandidate = {
                          ...iceEvent.candidate,
                          candidate: filtered,
                        };
                        const modifiedEvent = new RTCPeerConnectionIceEvent(
                          'icecandidate',
                          {
                            candidate: modifiedCandidate as RTCIceCandidate,
                          }
                        );
                        return (listener as any).call(this, modifiedEvent);
                      }
                    }
                    return (listener as any).call(this, iceEvent);
                  }
                : listener;

            return originalAddEventListener(type, wrappedListener as any, options);
          }

          return originalAddEventListener(type, listener, options);
        } as any;

        // Override onicecandidate
        let originalOnicecandidate = pc.onicecandidate;
        Object.defineProperty(pc, 'onicecandidate', {
          get() {
            return originalOnicecandidate;
          },
          set(handler: ((event: RTCPeerConnectionIceEvent) => void) | null) {
            originalOnicecandidate = handler
              ? function (event: RTCPeerConnectionIceEvent) {
                  if (event.candidate && event.candidate.candidate) {
                    const filtered = filterICECandidate(
                      event.candidate.candidate
                    );

                    if (!filtered) {
                      logger.debug('Blocked ICE candidate via onicecandidate');
                      return;
                    }

                    if (filtered !== event.candidate.candidate) {
                      const modifiedCandidate = {
                        ...event.candidate,
                        candidate: filtered,
                      };
                      const modifiedEvent = new RTCPeerConnectionIceEvent(
                        'icecandidate',
                        {
                          candidate: modifiedCandidate as RTCIceCandidate,
                        }
                      );
                      return handler.call(this, modifiedEvent);
                    }
                  }
                  return handler.call(this, event);
                }
              : null;
          },
        });

        // Override createOffer to add privacy settings
        const originalCreateOffer = pc.createOffer.bind(pc);
        pc.createOffer = function (
          options?: RTCOfferOptions
        ): Promise<RTCSessionDescriptionInit> {
          const modifiedOptions = options || {};
          // Disable host candidates if configured
          if (config.blockLocalIP) {
            (modifiedOptions as any).offerToReceiveAudio = false;
            (modifiedOptions as any).offerToReceiveVideo = false;
          }
          return originalCreateOffer(modifiedOptions);
        } as any;

        // Override getStats to filter IP information
        const originalGetStats = pc.getStats.bind(pc);
        pc.getStats = async function (
          selector?: MediaStreamTrack | null
        ): Promise<RTCStatsReport> {
          const stats = await originalGetStats(selector);

          // Filter out local/public IPs from stats
          const filteredStats = new Map();
          stats.forEach((stat, key) => {
            if (
              stat.type === 'local-candidate' ||
              stat.type === 'remote-candidate'
            ) {
              if (stat.ip) {
                if (
                  (config.blockPublicIP && isPublicIP(stat.ip)) ||
                  (config.blockLocalIP && isLocalIP(stat.ip))
                ) {
                  // Skip this stat
                  return;
                }
              }
            }
            filteredStats.set(key, stat);
          });

          return filteredStats;
        };

        return pc;
      } as any;

      // Copy static methods
      Object.setPrototypeOf(
        ProtectedRTCPeerConnection.prototype,
        originalRTCPeerConnection.prototype
      );
      Object.setPrototypeOf(
        ProtectedRTCPeerConnection,
        originalRTCPeerConnection
      );

      // Replace global RTCPeerConnection
      window.RTCPeerConnection = ProtectedRTCPeerConnection;
      (window as any).webkitRTCPeerConnection = ProtectedRTCPeerConnection;
      (window as any).mozRTCPeerConnection = ProtectedRTCPeerConnection;

      // Disable WebRTC media devices enumeration if blocking
      if (config.mode === 'block') {
        const originalEnumerateDevices =
          navigator.mediaDevices?.enumerateDevices;
        if (originalEnumerateDevices) {
          navigator.mediaDevices.enumerateDevices = async function (): Promise<
            MediaDeviceInfo[]
          > {
            const devices = await originalEnumerateDevices.call(this);
            // Return sanitized device list
            return devices.map((device) => ({
              ...device,
              deviceId: 'default',
              groupId: 'default',
              label: '',
            }));
          };
        }
      }

      logger.info('WebRTC Protection V2 injected successfully');
    }, this.config);

    logger.info('WebRTC Protection V2 injected into page');
  }

  /**
   * Detect WebRTC IP leaks
   */
  async detectLeaks(page: Page): Promise<WebRTCLeakDetection> {
    const result = await page.evaluate(async () => {
      const publicIPs: string[] = [];
      const localIPs: string[] = [];
      const ipv6Addresses: string[] = [];

      return new Promise<{
        publicIPs: string[];
        localIPs: string[];
        ipv6Addresses: string[];
      }>((resolve) => {
        const RTCPeerConnection =
          window.RTCPeerConnection ||
          (window as any).webkitRTCPeerConnection ||
          (window as any).mozRTCPeerConnection;

        if (!RTCPeerConnection) {
          resolve({ publicIPs, localIPs, ipv6Addresses });
          return;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        pc.createDataChannel('');
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .catch(() => {});

        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            pc.close();
            resolve({ publicIPs, localIPs, ipv6Addresses });
            return;
          }

          const candidate = event.candidate.candidate;
          if (!candidate) {return;}

          // Parse IP from candidate
          const ipMatch = /([0-9]{1,3}\.){3}[0-9]{1,3}|[a-f0-9:]+/i.exec(
            candidate
          );
          if (!ipMatch) {return;}

          const ip = ipMatch[0];

          // Categorize IP
          if (ip.includes(':')) {
            ipv6Addresses.push(ip);
          } else {
            const parts = ip.split('.');
            const first = parseInt(parts[0] || '0', 10);
            const second = parseInt(parts[1] || '0', 10);

            const isLocal =
              first === 10 ||
              (first === 172 && second >= 16 && second <= 31) ||
              (first === 192 && second === 168) ||
              first === 127 ||
              (first === 169 && second === 254);

            if (isLocal) {
              localIPs.push(ip);
            } else {
              publicIPs.push(ip);
            }
          }
        };

        // Timeout after 3 seconds
        setTimeout(() => {
          pc.close();
          resolve({ publicIPs, localIPs, ipv6Addresses });
        }, 3000);
      });
    });

    return {
      leaksDetected:
        result.publicIPs.length > 0 ||
        result.localIPs.length > 0 ||
        result.ipv6Addresses.length > 0,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WebRTCProtectionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('WebRTC Protection V2 configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): WebRTCProtectionConfig {
    return { ...this.config };
  }
}

/**
 * Create WebRTC protection v2 instance
 */
export function createWebRTCProtectionV2(
  config?: Partial<WebRTCProtectionConfig>
): WebRTCProtectionV2 {
  return new WebRTCProtectionV2(config);
}
