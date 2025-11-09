import { Page } from 'puppeteer';
import { WebDriverEvasionModule } from '../modules/webdriver-evasion';
import { FingerprintSpoofingModule } from '../modules/fingerprint-spoofing';
import { BehavioralSimulationModule } from '../modules/behavioral-simulation';
import { NetworkProtectionModule } from '../modules/network-protection';
import { logger } from '../utils/logger';
import {
  FingerprintProfile,
  generateFingerprintProfile,
} from '../utils/fingerprint-generator';

export interface StealthConfig {
  level?: 'basic' | 'advanced' | 'paranoid';
  webdriverEvasion?: boolean;
  fingerprintSpoofing?: boolean;
  behavioralSimulation?: boolean;
  networkProtection?: boolean;
  customFingerprint?: FingerprintProfile;
}

/**
 * Stealth Engine - Core protection system
 * Coordinates all anti-detection modules
 */
export class StealthEngine {
  private config: StealthConfig;
  private webdriverEvasion: WebDriverEvasionModule;
  private fingerprintSpoofer: FingerprintSpoofingModule;
  private behavioralSimulation: BehavioralSimulationModule;
  private networkProtection: NetworkProtectionModule | null = null;
  private fingerprint: FingerprintProfile;
  private initialized: boolean = false;

  constructor(config: StealthConfig = {}) {
    this.config = {
      level: config.level || 'advanced',
      webdriverEvasion: config.webdriverEvasion !== false,
      fingerprintSpoofing: config.fingerprintSpoofing !== false,
      behavioralSimulation: config.behavioralSimulation !== false,
      networkProtection: config.networkProtection !== false,
      customFingerprint: config.customFingerprint,
    };

    // Generate or use custom fingerprint
    this.fingerprint =
      this.config.customFingerprint || generateFingerprintProfile();

    // Initialize modules
    this.webdriverEvasion = new WebDriverEvasionModule();
    this.fingerprintSpoofer = new FingerprintSpoofingModule(this.fingerprint);
    this.behavioralSimulation = new BehavioralSimulationModule();

    logger.info(`StealthEngine initialized with level: ${this.config.level}`);
  }

  /**
   * Initialize the stealth engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('StealthEngine already initialized');
      return;
    }

    logger.info('Initializing StealthEngine modules...');

    // Modules are ready to use
    this.initialized = true;

    logger.info('StealthEngine initialization complete');
  }

  /**
   * Apply all protections to a page
   */
  async applyProtections(page: Page, userAgent: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.debug('Applying stealth protections to page');

    try {
      // Apply WebDriver evasion
      if (this.config.webdriverEvasion) {
        await this.webdriverEvasion.inject(page);
      }

      // Apply fingerprint spoofing
      if (this.config.fingerprintSpoofing) {
        await this.fingerprintSpoofer.inject(page);
      }

      // Apply behavioral simulation helpers
      if (this.config.behavioralSimulation) {
        await this.behavioralSimulation.injectHelpers(page);
      }

      // Setup network protection
      if (this.config.networkProtection) {
        if (!this.networkProtection) {
          this.networkProtection = new NetworkProtectionModule(userAgent);
        }
        await this.networkProtection.setupInterception(page);
        await this.networkProtection.setExtraHeaders(page);
      }

      logger.debug('All stealth protections applied successfully');
    } catch (error) {
      logger.error('Error applying stealth protections:', error);
      throw error;
    }
  }

  /**
   * Update the fingerprint profile
   */
  updateFingerprint(fingerprint?: FingerprintProfile): void {
    this.fingerprint = fingerprint || generateFingerprintProfile();
    this.fingerprintSpoofer.setProfile(this.fingerprint);
    logger.info('Fingerprint profile updated');
  }

  /**
   * Get current fingerprint
   */
  getFingerprint(): FingerprintProfile {
    return this.fingerprint;
  }

  /**
   * Get configuration
   */
  getConfig(): StealthConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StealthConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('StealthEngine configuration updated', this.config);
  }

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get behavioral simulation module
   */
  getBehavioralSimulation(): BehavioralSimulationModule {
    return this.behavioralSimulation;
  }

  /**
   * Get network protection module
   */
  getNetworkProtection(): NetworkProtectionModule | null {
    return this.networkProtection;
  }
}
