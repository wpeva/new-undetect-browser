/**
 * Advanced WebRTC Spoofing Module v2
 *
 * COMPLETELY rewrites RTCPeerConnection to prevent IP leaks.
 * Instead of trying to patch, we intercept at the deepest level.
 */

import { Page } from 'puppeteer';

export type WebRTCMode = 'disable' | 'spoof' | 'custom';

export interface WebRTCSpoofConfig {
  mode: WebRTCMode;
  publicIP?: string;
  localIP?: string;
  stunServers?: string[];
  enabled?: boolean;
  substituteAllIPs?: boolean;
}

export const DEFAULT_WEBRTC_CONFIG: WebRTCSpoofConfig = {
  mode: 'spoof',
  enabled: true,
  substituteAllIPs: true,
};

/**
 * Apply WebRTC spoofing - MUST be called with evaluateOnNewDocument BEFORE page loads
 */
export async function applyWebRTCSpoofing(
  page: Page,
  config: WebRTCSpoofConfig
): Promise<void> {
  await page.evaluateOnNewDocument((cfg: WebRTCSpoofConfig) => {
    const publicIP = cfg.publicIP || '1.1.1.1';
    const localIP = cfg.localIP || '192.168.1.100';

    // ============================================================
    // Helper: Replace IPs in ICE candidate strings
    // ============================================================
    function replaceIPsInCandidate(candidate: string): string {
      if (!candidate) return candidate;

      // Replace IPv4 addresses
      let result = candidate.replace(
        /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,
        (match) => {
          // Private IPs -> fake local IP
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
            match.startsWith('127.') ||
            match.startsWith('169.254.')
          ) {
            return localIP;
          }
          // Public IPs -> proxy IP
          return publicIP;
        }
      );

      // Replace IPv6 addresses with localhost
      result = result.replace(
        /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g,
        '::1'
      );
      result = result.replace(
        /::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/gi,
        `::ffff:${publicIP}`
      );

      return result;
    }

    // ============================================================
    // MODE: DISABLE - Block WebRTC completely
    // ============================================================
    if (cfg.mode === 'disable' || cfg.enabled === false) {
      Object.defineProperty(window, 'RTCPeerConnection', {
        value: undefined,
        writable: false,
        configurable: false,
      });
      Object.defineProperty(window, 'webkitRTCPeerConnection', {
        value: undefined,
        writable: false,
        configurable: false,
      });
      Object.defineProperty(window, 'mozRTCPeerConnection', {
        value: undefined,
        writable: false,
        configurable: false,
      });
      return;
    }

    // ============================================================
    // MODE: SPOOF - Replace all IPs with proxy IPs
    // ============================================================
    const OriginalRTCPeerConnection = (window as any).RTCPeerConnection;
    const OriginalRTCSessionDescription = (window as any).RTCSessionDescription;

    if (!OriginalRTCPeerConnection) {
      return;
    }

    // Create a wrapped RTCPeerConnection
    function WrappedRTCPeerConnection(
      this: any,
      configuration?: RTCConfiguration
    ): RTCPeerConnection {
      // Create original connection
      const pc: RTCPeerConnection = new OriginalRTCPeerConnection(configuration);

      // Store original methods
      const origAddEventListener = pc.addEventListener.bind(pc);
      const origSetLocalDescription = pc.setLocalDescription.bind(pc);
      const origSetRemoteDescription = pc.setRemoteDescription.bind(pc);
      const origCreateOffer = pc.createOffer.bind(pc);
      const origCreateAnswer = pc.createAnswer.bind(pc);

      // Track icecandidate handlers
      const iceCandidateHandlers: Set<EventListenerOrEventListenerObject> = new Set();

      // Function to create modified ICE event
      function createModifiedIceEvent(
        originalEvent: RTCPeerConnectionIceEvent
      ): RTCPeerConnectionIceEvent {
        if (!originalEvent.candidate) {
          return originalEvent;
        }

        const originalCandidate = originalEvent.candidate.candidate;
        const modifiedCandidate = replaceIPsInCandidate(originalCandidate);

        try {
          const newIceCandidate = new RTCIceCandidate({
            candidate: modifiedCandidate,
            sdpMid: originalEvent.candidate.sdpMid,
            sdpMLineIndex: originalEvent.candidate.sdpMLineIndex,
            usernameFragment: originalEvent.candidate.usernameFragment,
          });

          return new RTCPeerConnectionIceEvent('icecandidate', {
            candidate: newIceCandidate,
          });
        } catch {
          return originalEvent;
        }
      }

      // Override addEventListener
      pc.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
      ): void {
        if (type === 'icecandidate' && listener) {
          iceCandidateHandlers.add(listener);

          const wrappedListener = function (event: Event) {
            const iceEvent = event as RTCPeerConnectionIceEvent;
            const modifiedEvent = createModifiedIceEvent(iceEvent);

            if (typeof listener === 'function') {
              listener.call(pc, modifiedEvent);
            } else if (listener.handleEvent) {
              listener.handleEvent(modifiedEvent);
            }
          };

          origAddEventListener.call(pc, type, wrappedListener, options);
        } else {
          origAddEventListener.call(pc, type, listener, options);
        }
      };

      // Override onicecandidate property
      let _onicecandidate: ((ev: RTCPeerConnectionIceEvent) => any) | null = null;

      Object.defineProperty(pc, 'onicecandidate', {
        get() {
          return _onicecandidate;
        },
        set(handler: ((ev: RTCPeerConnectionIceEvent) => any) | null) {
          _onicecandidate = handler;

          // Set the internal handler
          (pc as any).__onicecandidate_internal = handler
            ? function (event: RTCPeerConnectionIceEvent) {
                const modifiedEvent = createModifiedIceEvent(event);
                handler.call(pc, modifiedEvent);
              }
            : null;

          origAddEventListener.call(
            pc,
            'icecandidate',
            (pc as any).__onicecandidate_internal
          );
        },
        configurable: true,
      });

      // Helper to modify SDP
      function modifySDP(sdp: string | undefined): string | undefined {
        if (!sdp) return sdp;
        return replaceIPsInCandidate(sdp);
      }

      // Override setLocalDescription
      pc.setLocalDescription = async function (
        description?: RTCLocalSessionDescriptionInit
      ): Promise<void> {
        if (description && description.sdp) {
          description = {
            ...description,
            sdp: modifySDP(description.sdp),
          };
        }
        return origSetLocalDescription.call(pc, description);
      };

      // Override setRemoteDescription
      pc.setRemoteDescription = async function (
        description: RTCSessionDescriptionInit
      ): Promise<void> {
        if (description && description.sdp) {
          description = {
            ...description,
            sdp: modifySDP(description.sdp),
          };
        }
        return origSetRemoteDescription.call(pc, description);
      };

      // Override createOffer
      (pc as any).createOffer = async function (
        options?: RTCOfferOptions
      ): Promise<RTCSessionDescriptionInit> {
        const offer = await origCreateOffer.call(pc, options);
        if (offer.sdp) {
          offer.sdp = modifySDP(offer.sdp);
        }
        return offer;
      };

      // Override createAnswer
      (pc as any).createAnswer = async function (
        options?: RTCAnswerOptions
      ): Promise<RTCSessionDescriptionInit> {
        const answer = await origCreateAnswer.call(pc, options);
        if (answer.sdp) {
          answer.sdp = modifySDP(answer.sdp);
        }
        return answer;
      };

      // Override getStats
      const origGetStats = pc.getStats.bind(pc);
      pc.getStats = async function (
        selector?: MediaStreamTrack | null
      ): Promise<RTCStatsReport> {
        const stats = await origGetStats.call(pc, selector);

        // Create modified stats
        const modifiedStats = new Map();

        stats.forEach((value: any, key: string) => {
          const modifiedValue = { ...value };

          // Modify IP addresses in candidate stats
          if (modifiedValue.address) {
            modifiedValue.address = replaceIPsInCandidate(modifiedValue.address);
          }
          if (modifiedValue.ip) {
            modifiedValue.ip = replaceIPsInCandidate(modifiedValue.ip);
          }
          if (modifiedValue.candidateType === 'srflx') {
            modifiedValue.address = publicIP;
            modifiedValue.ip = publicIP;
          }

          modifiedStats.set(key, modifiedValue);
        });

        return modifiedStats as RTCStatsReport;
      };

      // Override localDescription getter
      const origLocalDescGetter = Object.getOwnPropertyDescriptor(
        RTCPeerConnection.prototype,
        'localDescription'
      )?.get;

      if (origLocalDescGetter) {
        Object.defineProperty(pc, 'localDescription', {
          get() {
            const desc = origLocalDescGetter.call(pc);
            if (desc && desc.sdp) {
              return new OriginalRTCSessionDescription({
                type: desc.type,
                sdp: modifySDP(desc.sdp),
              });
            }
            return desc;
          },
          configurable: true,
        });
      }

      return pc;
    }

    // Copy prototype and static properties
    WrappedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    Object.keys(OriginalRTCPeerConnection).forEach((key) => {
      (WrappedRTCPeerConnection as any)[key] = (OriginalRTCPeerConnection as any)[key];
    });

    // Replace global RTCPeerConnection
    Object.defineProperty(window, 'RTCPeerConnection', {
      value: WrappedRTCPeerConnection,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'webkitRTCPeerConnection', {
      value: WrappedRTCPeerConnection,
      writable: true,
      configurable: true,
    });

  }, config);
}

/**
 * Create WebRTC configuration from proxy settings
 */
export function createWebRTCConfigFromProxy(proxyIP?: string): WebRTCSpoofConfig {
  if (!proxyIP) {
    return DEFAULT_WEBRTC_CONFIG;
  }

  const ipParts = proxyIP.split('.');
  const fakeLocalIP = `192.168.${parseInt(ipParts[2] || '1') % 255}.${parseInt(ipParts[3] || '1') % 255}`;

  return {
    mode: 'spoof',
    enabled: true,
    publicIP: proxyIP,
    localIP: fakeLocalIP,
    substituteAllIPs: true,
  };
}

/**
 * Test WebRTC spoofing
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
                if (!localIPs.includes(ip)) localIPs.push(ip);
              } else {
                if (!publicIPs.includes(ip)) publicIPs.push(ip);
              }
            }
          };

          void pc.createOffer().then((offer) => pc.setLocalDescription(offer));

          setTimeout(() => {
            pc.close();
            resolve({ localIPs, publicIPs, working: localIPs.length > 0 || publicIPs.length > 0 });
          }, 5000);
        } catch {
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

  if (!test.working) {
    issues.push('WebRTC is not working');
  }

  const hasRealPublicIP = test.publicIPs.some((ip) => ip !== expectedProxyIP);

  if (hasRealPublicIP) {
    issues.push(`Public IP leak: ${test.publicIPs.join(', ')}`);
  }

  return {
    success: issues.length === 0,
    issues,
    ips: {
      local: test.localIPs,
      public: test.publicIPs,
    },
  };
}

export function getRecommendedWebRTCConfig(threatLevel: 'low' | 'medium' | 'high'): WebRTCSpoofConfig {
  switch (threatLevel) {
    case 'high':
      return { mode: 'disable', enabled: false };
    default:
      return { mode: 'spoof', enabled: true, substituteAllIPs: true };
  }
}
