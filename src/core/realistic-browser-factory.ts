/**
 * Realistic Browser Factory
 *
 * High-level API for creating the most realistic, undetectable browsers possible.
 * Automatically handles proxy-to-fingerprint consistency, human behavior simulation,
 * and all advanced evasion techniques.
 *
 * This is the easiest way to use UndetectBrowser's advanced features.
 */

import { Browser, Page } from 'puppeteer';
import { UndetectBrowser, LaunchOptions } from '../index';
import { ProxyConfig } from './proxy-manager';
import {
  generateConsistentFingerprint,
  applyConsistentFingerprint,
  ConsistentFingerprint,
} from '../modules/consistent-fingerprint';
import {
  generateHumanBehaviorProfile,
  humanType,
  humanClick,
  humanScroll,
  humanMoveMouse,
  humanReadPage,
  humanExplorePage,
  humanFillForm,
  HumanBehaviorProfile,
} from '../modules/realistic-human-behavior';
import { logger, LogLevel } from '../utils/logger';

/**
 * Configuration for realistic browser
 */
export interface RealisticBrowserConfig {
  /** Proxy configuration */
  proxy?: ProxyConfig;

  /** Country code (e.g., 'US', 'GB', 'DE') - auto-detected from proxy if not provided */
  country?: string;

  /** User seed for consistent fingerprint generation */
  userSeed?: string;

  /** Puppeteer launch options */
  launchOptions?: LaunchOptions;

  /** Whether to apply human behavior automatically */
  autoHumanBehavior?: boolean;
}

/**
 * Enhanced page with human-like methods
 */
export interface RealisticPage extends Page {
  /** Human-like typing */
  humanType(selector: string, text: string): Promise<void>;

  /** Human-like click */
  humanClick(selector: string): Promise<void>;

  /** Human-like scroll - scroll in a direction by amount */
  humanScrollSimple(direction: 'up' | 'down', amount: number): Promise<void>;

  /** Human-like mouse movement */
  humanMoveMouse(x: number, y: number): Promise<void>;

  /** Simulate reading page content */
  humanReadPage(): Promise<void>;

  /** Explore page elements */
  humanExplorePage(): Promise<void>;

  /** Fill form with human behavior */
  humanFillForm(formData: Record<string, string>): Promise<void>;

  /** Get the fingerprint used */
  getFingerprint(): ConsistentFingerprint;

  /** Get the biometric profile used */
  getHumanBehaviorProfile(): HumanBehaviorProfile;
}

/**
 * Realistic Browser Instance
 */
export class RealisticBrowserInstance {
  private browserInstance: any;
  private fingerprint: ConsistentFingerprint;
  private biometricProfile: HumanBehaviorProfile;
  private proxyCountry: string;
  private config: RealisticBrowserConfig;

  constructor(
    browserInstance: any,
    fingerprint: ConsistentFingerprint,
    biometricProfile: HumanBehaviorProfile,
    proxyCountry: string,
    config: RealisticBrowserConfig
  ) {
    this.browserInstance = browserInstance;
    this.fingerprint = fingerprint;
    this.biometricProfile = biometricProfile;
    this.proxyCountry = proxyCountry;
    this.config = config;
  }

  /**
   * Create a new page with all realistic behaviors enabled
   */
  async newPage(): Promise<RealisticPage> {
    const page = await this.browserInstance.newPage();

    // Apply consistent fingerprint
    await applyConsistentFingerprint(page, this.fingerprint);

    // Enhance page with human-like methods
    const enhancedPage = page as RealisticPage;

    // Bind human behavior methods to this page and profile
    enhancedPage.humanType = async (selector: string, text: string) => {
      return humanType(page, selector, text, this.biometricProfile);
    };

    enhancedPage.humanClick = async (selector: string) => {
      return humanClick(page, selector, this.biometricProfile);
    };

    enhancedPage.humanScrollSimple = async (direction: 'up' | 'down', amount: number) => {
      return humanScroll(page, direction, amount, this.biometricProfile);
    };

    enhancedPage.humanMoveMouse = async (x: number, y: number) => {
      return humanMoveMouse(page, x, y, this.biometricProfile);
    };

    enhancedPage.humanReadPage = async () => {
      return humanReadPage(page, this.biometricProfile);
    };

    enhancedPage.humanExplorePage = async () => {
      return humanExplorePage(page, this.biometricProfile);
    };

    enhancedPage.humanFillForm = async (formData: Record<string, string>) => {
      return humanFillForm(page, formData, this.biometricProfile);
    };

    enhancedPage.getFingerprint = () => {
      return this.fingerprint;
    };

    enhancedPage.getHumanBehaviorProfile = () => {
      return this.biometricProfile;
    };

    logger.debug('Created new realistic page');

    return enhancedPage;
  }

  /**
   * Get all pages
   */
  async pages(): Promise<Page[]> {
    return this.browserInstance.pages();
  }

  /**
   * Get the underlying browser instance
   */
  getBrowser(): Browser {
    return this.browserInstance.getBrowser();
  }

  /**
   * Get the fingerprint used
   */
  getFingerprint(): ConsistentFingerprint {
    return this.fingerprint;
  }

  /**
   * Get the biometric profile used
   */
  getHumanBehaviorProfile(): HumanBehaviorProfile {
    return this.biometricProfile;
  }

  /**
   * Get the detected proxy country
   */
  getProxyCountry(): string {
    return this.proxyCountry;
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    await this.browserInstance.close();
    logger.info('Realistic browser closed');
  }
}

/**
 * Realistic Browser Factory
 *
 * Main class for creating realistic browsers with automatic
 * proxy-fingerprint consistency and human behavior.
 */
export class RealisticBrowserFactory {
  private undetect: UndetectBrowser;

  constructor() {
    this.undetect = new UndetectBrowser({
      logLevel: LogLevel.INFO,
    });
  }

  /**
   * Create a realistic browser instance
   *
   * This method automatically:
   * 1. Detects proxy country (or uses provided country)
   * 2. Generates consistent fingerprint matching the country
   * 3. Generates biometric profile for human behavior
   * 4. Launches browser with proxy
   * 5. Applies all protections and configurations
   *
   * @param config - Configuration options
   * @returns Realistic browser instance
   */
  async create(config: RealisticBrowserConfig = {}): Promise<RealisticBrowserInstance> {
    logger.info('Creating realistic browser...');

    // Step 1: Determine country
    let country = config.country || 'US';

    if (config.proxy && !config.country) {
      // Auto-detect country from proxy
      country = await this.detectProxyCountry(config.proxy);
      logger.info(`Auto-detected proxy country: ${country}`);
    }

    // Step 2: Generate consistent fingerprint
    const userSeed = config.userSeed || this.generateRandomSeed();
    const fingerprint = generateConsistentFingerprint(country, userSeed);

    logger.info(`Generated fingerprint for ${country}`);
    logger.debug(`  Timezone: ${fingerprint.timezone}`);
    logger.debug(`  Locale: ${fingerprint.locale}`);
    logger.debug(`  Languages: ${fingerprint.languages.join(', ')}`);

    // Step 3: Generate biometric profile
    const biometricProfile = generateHumanBehaviorProfile(userSeed);

    logger.debug(`Generated biometric profile:`);
    logger.debug(`  Typing: ${Math.round(biometricProfile.typingSpeed)} WPM`);
    logger.debug(`  Mouse: ${Math.round(biometricProfile.mouseSpeed)} px/s`);
    logger.debug(`  Reaction: ${Math.round(biometricProfile.reactionTime)} ms`);

    // Step 4: Prepare launch options
    const launchOptions: LaunchOptions = {
      headless: false,
      ...config.launchOptions,
    };

    // Add proxy if provided
    if (config.proxy) {
      const proxyServer = this.formatProxyServer(config.proxy);
      launchOptions.args = [
        `--proxy-server=${proxyServer}`,
        ...(launchOptions.args || []),
      ];

      logger.info(`Using proxy: ${proxyServer}`);
    }

    // Step 5: Launch browser
    const browserInstance = await this.undetect.launch(launchOptions);

    logger.info('Browser launched successfully');

    // Step 6: Create realistic instance
    const instance = new RealisticBrowserInstance(
      browserInstance,
      fingerprint,
      biometricProfile,
      country,
      config
    );

    // Step 7: Setup first page if proxy auth is needed
    if (config.proxy && config.proxy.username && config.proxy.password) {
      const pages = await browserInstance.pages();
      if (pages.length > 0) {
        await pages[0].authenticate({
          username: config.proxy.username,
          password: config.proxy.password,
        });
      }
    }

    logger.info('Realistic browser ready');

    return instance;
  }

  /**
   * Create multiple browser instances (for parallel operations)
   */
  async createMultiple(
    configs: RealisticBrowserConfig[]
  ): Promise<RealisticBrowserInstance[]> {
    logger.info(`Creating ${configs.length} realistic browsers...`);

    const instances = await Promise.all(configs.map((config) => this.create(config)));

    logger.info(`Created ${instances.length} browsers`);

    return instances;
  }

  /**
   * Detect country from proxy (mock - replace with real implementation)
   */
  private async detectProxyCountry(proxy: ProxyConfig): Promise<string> {
    // TODO: In production, implement real geolocation detection:
    // - Use GeoIP API (MaxMind, IP2Location, etc.)
    // - Query proxy provider API
    // - Make test request through proxy to geolocation service

    // For now, return a random country
    const countries = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'RU', 'CN', 'JP', 'BR', 'AU', 'CA'];
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];

    logger.debug(`[Mock] Detected country ${randomCountry} for proxy ${proxy.host}`);

    return randomCountry;
  }

  /**
   * Format proxy server string for Puppeteer
   */
  private formatProxyServer(proxy: ProxyConfig): string {
    return `${proxy.type}://${proxy.host}:${proxy.port}`;
  }

  /**
   * Generate random seed for consistent behavior
   */
  private generateRandomSeed(): string {
    return `seed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Convenience function to create a realistic browser quickly
 *
 * @example
 * ```typescript
 * import { createRealisticBrowser } from './core/realistic-browser-factory';
 *
 * const browser = await createRealisticBrowser({
 *   proxy: {
 *     type: 'http',
 *     host: '1.2.3.4',
 *     port: 8080
 *   }
 * });
 *
 * const page = await browser.newPage();
 * await page.goto('https://example.com');
 * await page.humanClick('#button');
 * await page.humanType('#input', 'Hello World');
 * ```
 */
export async function createRealisticBrowser(
  config: RealisticBrowserConfig = {}
): Promise<RealisticBrowserInstance> {
  const factory = new RealisticBrowserFactory();
  return factory.create(config);
}

/**
 * Convenience function to create multiple realistic browsers
 *
 * @example
 * ```typescript
 * const browsers = await createRealisticBrowsers([
 *   { proxy: { type: 'http', host: '1.2.3.4', port: 8080 } },
 *   { proxy: { type: 'http', host: '5.6.7.8', port: 8080 } },
 * ]);
 * ```
 */
export async function createRealisticBrowsers(
  configs: RealisticBrowserConfig[]
): Promise<RealisticBrowserInstance[]> {
  const factory = new RealisticBrowserFactory();
  return factory.createMultiple(configs);
}
