import { Page, HTTPRequest } from 'puppeteer';
import { logger } from '../utils/logger';

export interface NetworkTimingProfile {
  dnsLookup: () => number;
  tcpConnect: () => number;
  tlsHandshake: () => number;
  ttfb: () => number;
}

/**
 * Network Protection Module
 * Manages HTTP headers, request interception, and network-level protection
 */
export class NetworkProtectionModule {
  private timing: NetworkTimingProfile;
  private userAgent: string;

  constructor(userAgent: string) {
    this.userAgent = userAgent;
    this.timing = this.generateTimingProfile();
  }

  /**
   * Setup request interception for the page
   */
  async setupInterception(page: Page): Promise<void> {
    await page.setRequestInterception(true);

    page.on('request', (request: HTTPRequest) => {
      this.interceptRequest(request).catch((error) => {
        logger.error('Request interception error:', error);
        request.continue().catch(() => {
          // Request already handled
        });
      });
    });

    logger.debug('Network interception setup complete');
  }

  /**
   * Intercept and modify requests
   */
  private async interceptRequest(request: HTTPRequest): Promise<void> {
    // Skip special URLs that can't be intercepted properly
    const url = request.url();
    if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('chrome:') || url.startsWith('file:')) {
      await request.continue();
      return;
    }

    try {
      const headers = { ...request.headers() };

      // Remove automation headers
      delete headers['X-Devtools-Emulate-Network-Conditions-Client-Id'];
      delete headers['X-DevTools-Request-Id'];

      // Add/modify realistic headers
      const parsedUrl = new URL(url);
      const resourceType = request.resourceType();

      // Accept header based on resource type
      if (!headers['accept']) {
        headers['accept'] = this.getAcceptHeader(resourceType);
      }

      // Accept-Language
      if (!headers['accept-language']) {
        headers['accept-language'] = 'en-US,en;q=0.9';
      }

      // Accept-Encoding
      if (!headers['accept-encoding']) {
        headers['accept-encoding'] = 'gzip, deflate, br';
      }

      // Sec-Fetch-* headers (Chrome 80+)
      headers['sec-fetch-dest'] = this.getSecFetchDest(resourceType);
      headers['sec-fetch-mode'] = this.getSecFetchMode(resourceType, request.isNavigationRequest());
      headers['sec-fetch-site'] = this.getSecFetchSite(parsedUrl, request.frame());

      if (request.isNavigationRequest()) {
        headers['sec-fetch-user'] = '?1';
      }

      // Upgrade-Insecure-Requests for navigation
      if (request.isNavigationRequest()) {
        headers['upgrade-insecure-requests'] = '1';
      }

      // Cache-Control
      if (request.isNavigationRequest()) {
        headers['cache-control'] = 'max-age=0';
      }

      // Referer handling
      if (request.redirectChain().length > 0) {
        const previousUrl = request.redirectChain()[request.redirectChain().length - 1].url();
        headers['referer'] = previousUrl;
      }

      await request.continue({ headers });
    } catch {
      // If anything fails, just continue without modifications
      try {
        await request.continue();
      } catch {
        // Request already handled, ignore
      }
    }
  }

  /**
   * Get Accept header based on resource type
   */
  private getAcceptHeader(resourceType: string): string {
    const acceptMap: Record<string, string> = {
      document: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      stylesheet: 'text/css,*/*;q=0.1',
      image: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      script: '*/*',
      font: '*/*',
      xhr: '*/*',
      fetch: '*/*',
    };

    return acceptMap[resourceType] || '*/*';
  }

  /**
   * Get Sec-Fetch-Dest header value
   */
  private getSecFetchDest(resourceType: string): string {
    const destMap: Record<string, string> = {
      document: 'document',
      stylesheet: 'style',
      image: 'image',
      media: 'video',
      font: 'font',
      script: 'script',
      xhr: 'empty',
      fetch: 'empty',
      eventsource: 'empty',
      websocket: 'websocket',
      manifest: 'manifest',
      other: 'empty',
    };

    return destMap[resourceType] || 'empty';
  }

  /**
   * Get Sec-Fetch-Mode header value
   */
  private getSecFetchMode(resourceType: string, isNavigation: boolean): string {
    if (isNavigation) {
      return 'navigate';
    }

    const modeMap: Record<string, string> = {
      xhr: 'cors',
      fetch: 'cors',
      eventsource: 'cors',
      websocket: 'websocket',
    };

    return modeMap[resourceType] || 'no-cors';
  }

  /**
   * Get Sec-Fetch-Site header value
   */
  private getSecFetchSite(url: URL, frame: any): string {
    try {
      const frameUrl = frame?.url();
      if (!frameUrl || frameUrl === 'about:blank') {
        return 'none';
      }

      const frameOrigin = new URL(frameUrl);

      if (url.origin === frameOrigin.origin) {
        return 'same-origin';
      }

      // Check if same-site (same eTLD+1)
      if (this.isSameSite(url.hostname, frameOrigin.hostname)) {
        return 'same-site';
      }

      return 'cross-site';
    } catch {
      return 'none';
    }
  }

  /**
   * Check if two hostnames are same-site
   */
  private isSameSite(hostname1: string, hostname2: string): boolean {
    const getBaseDomain = (hostname: string): string => {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return hostname;
    };

    return getBaseDomain(hostname1) === getBaseDomain(hostname2);
  }

  /**
   * Generate realistic network timing profile
   */
  private generateTimingProfile(): NetworkTimingProfile {
    return {
      dnsLookup: () => Math.random() * 50 + 10, // 10-60ms
      tcpConnect: () => Math.random() * 100 + 30, // 30-130ms
      tlsHandshake: () => Math.random() * 150 + 50, // 50-200ms
      ttfb: () => Math.random() * 200 + 100, // 100-300ms
    };
  }

  /**
   * Set extra HTTP headers for the page
   */
  async setExtraHeaders(page: Page, customHeaders?: Record<string, string>): Promise<void> {
    const headers: Record<string, string> = {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      ...customHeaders,
    };

    await page.setExtraHTTPHeaders(headers);
    logger.debug('Extra HTTP headers set');
  }

  /**
   * Get module name
   */
  getName(): string {
    return 'NetworkProtection';
  }
}
