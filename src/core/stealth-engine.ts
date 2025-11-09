import { Page } from 'puppeteer';
import { WebDriverEvasionModule } from '../modules/webdriver-evasion';
import { FingerprintSpoofingModule } from '../modules/fingerprint-spoofing';
import { BehavioralSimulationModule } from '../modules/behavioral-simulation';
import { NetworkProtectionModule } from '../modules/network-protection';
import { AdvancedEvasionsModule } from '../modules/advanced-evasions';
import { HeadlessDetectionProtection } from '../modules/headless-detection-protection';
import { AutomationDetectionProtection } from '../modules/automation-detection-protection';
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
  advancedEvasions?: boolean;
  headlessProtection?: boolean;
  automationProtection?: boolean;
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
  private advancedEvasions: AdvancedEvasionsModule;
  private headlessProtection: HeadlessDetectionProtection;
  private automationProtection: AutomationDetectionProtection;
  private networkProtection: NetworkProtectionModule | null = null;
  private fingerprint: FingerprintProfile;
  private initialized: boolean = false;

  constructor(config: StealthConfig = {}) {
    const level = config.level || 'advanced';

    // Apply level-based defaults
    this.config = {
      level,
      webdriverEvasion: config.webdriverEvasion ?? true,
      fingerprintSpoofing: config.fingerprintSpoofing ?? (level !== 'basic'),
      behavioralSimulation: config.behavioralSimulation ?? (level !== 'basic'),
      networkProtection: config.networkProtection ?? (level !== 'basic'),
      advancedEvasions: config.advancedEvasions ?? (level === 'paranoid'),
      headlessProtection: config.headlessProtection ?? true, // Always enable by default
      automationProtection: config.automationProtection ?? (level !== 'basic'),
      customFingerprint: config.customFingerprint,
    };

    // Generate or use custom fingerprint
    this.fingerprint =
      this.config.customFingerprint || generateFingerprintProfile();

    // Initialize modules
    this.webdriverEvasion = new WebDriverEvasionModule();
    this.fingerprintSpoofer = new FingerprintSpoofingModule(this.fingerprint);
    this.behavioralSimulation = new BehavioralSimulationModule();
    this.advancedEvasions = new AdvancedEvasionsModule();
    this.headlessProtection = new HeadlessDetectionProtection();
    this.automationProtection = new AutomationDetectionProtection();

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
      // Apply WebDriver evasion (always first)
      if (this.config.webdriverEvasion) {
        await this.webdriverEvasion.inject(page);
      }

      // Apply headless detection protection (early)
      if (this.config.headlessProtection) {
        await this.headlessProtection.inject(page);
      }

      // Apply automation detection protection (early)
      if (this.config.automationProtection) {
        await this.automationProtection.inject(page);
      }

      // Apply fingerprint spoofing
      if (this.config.fingerprintSpoofing) {
        await this.fingerprintSpoofer.inject(page);
      }

      // Apply advanced evasions (paranoid mode)
      if (this.config.advancedEvasions) {
        await this.advancedEvasions.inject(page);
      }

      // Apply behavioral simulation helpers
      if (this.config.behavioralSimulation) {
        await this.behavioralSimulation.injectHelpers(page);
      }

      // Setup network protection (always last)
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
    logger.info('StealthEngine configuration updated', this.config as unknown as Record<string, unknown>);
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

  /**
   * Get advanced evasions module
   */
  getAdvancedEvasions(): AdvancedEvasionsModule {
    return this.advancedEvasions;
  }

  /**
   * Get headless protection module
   */
  getHeadlessProtection(): HeadlessDetectionProtection {
    return this.headlessProtection;
  }

  /**
   * Get automation protection module
   */
  getAutomationProtection(): AutomationDetectionProtection {
    return this.automationProtection;
  }
}
