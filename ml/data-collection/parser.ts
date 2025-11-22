/**
 * ML Fingerprint Parser
 * Session 9: Machine Learning Dataset Collection
 *
 * Parses and normalizes collected fingerprint data
 */

import * as fs from 'fs';
import {
  Fingerprint,
  ParsedFingerprint,
  DatasetStats,
} from '../types/fingerprint';

export class FingerprintParser {
  private fingerprints: Fingerprint[] = [];
  private parsedFingerprints: ParsedFingerprint[] = [];

  /**
   * Load fingerprints from file
   */
  loadFromFile(filePath: string): void {
    const data = fs.readFileSync(filePath, 'utf-8');
    this.fingerprints = JSON.parse(data);
    console.log(`📂 Loaded ${this.fingerprints.length} fingerprints from ${filePath}`);
  }

  /**
   * Load fingerprints from array
   */
  loadFromArray(fingerprints: Fingerprint[]): void {
    this.fingerprints = fingerprints;
    console.log(`📂 Loaded ${this.fingerprints.length} fingerprints from array`);
  }

  /**
   * Parse and normalize all fingerprints
   */
  parseAll(): ParsedFingerprint[] {
    console.log(`🔄 Parsing ${this.fingerprints.length} fingerprints...`);

    this.parsedFingerprints = this.fingerprints.map((fp, index) => {
      if ((index + 1) % 100 === 0) {
        console.log(`  Progress: ${index + 1}/${this.fingerprints.length}`);
      }
      return this.parseFingerprint(fp);
    });

    console.log(`✅ Parsed ${this.parsedFingerprints.length} fingerprints`);
    return this.parsedFingerprints;
  }

  /**
   * Parse a single fingerprint
   */
  private parseFingerprint(fingerprint: Fingerprint): ParsedFingerprint {
    const normalized = this.normalizeFingerprint(fingerprint);
    const quality = this.calculateQuality(normalized);
    const validationErrors = this.validateFingerprint(normalized);

    return {
      ...normalized,
      normalized: true,
      validated: validationErrors.length === 0,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      quality,
    };
  }

  /**
   * Normalize fingerprint data
   */
  private normalizeFingerprint(fingerprint: Fingerprint): Fingerprint {
    const normalized = { ...fingerprint };

    // Normalize user agent
    normalized.metadata.userAgent = this.normalizeUserAgent(fingerprint.metadata.userAgent);

    // Normalize browser name
    normalized.metadata.browserName = this.normalizeBrowserName(
      fingerprint.metadata.browserName,
      fingerprint.metadata.userAgent
    );

    // Normalize OS
    normalized.metadata.osName = this.normalizeOSName(
      fingerprint.metadata.osName,
      fingerprint.metadata.userAgent
    );

    // Normalize languages
    if (normalized.hardware.languages) {
      normalized.hardware.languages = normalized.hardware.languages.map((lang) =>
        lang.toLowerCase()
      );
    }

    if (normalized.navigator.languages) {
      normalized.navigator.languages = normalized.navigator.languages.map((lang) =>
        lang.toLowerCase()
      );
    }

    // Normalize WebGL extensions
    if (normalized.webgl.extensions) {
      normalized.webgl.extensions = normalized.webgl.extensions.sort();
    }

    // Normalize fonts
    if (normalized.fonts.availableFonts) {
      normalized.fonts.availableFonts = normalized.fonts.availableFonts.sort();
    }

    return normalized;
  }

  /**
   * Normalize user agent string
   */
  private normalizeUserAgent(userAgent: string): string {
    // Remove specific version numbers that are too granular
    return userAgent.trim();
  }

  /**
   * Normalize browser name
   */
  private normalizeBrowserName(browserName: string, userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
    if (ua.includes('firefox/')) return 'Firefox';
    if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
    if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';

    return browserName;
  }

  /**
   * Normalize OS name
   */
  private normalizeOSName(osName: string, userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('windows nt')) return 'Windows';
    if (ua.includes('mac os x')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';

    return osName;
  }

  /**
   * Validate fingerprint data
   */
  private validateFingerprint(fingerprint: Fingerprint): string[] {
    const errors: string[] = [];

    // Check required fields
    if (!fingerprint.id) errors.push('Missing ID');
    if (!fingerprint.timestamp) errors.push('Missing timestamp');
    if (!fingerprint.canvas) errors.push('Missing canvas data');
    if (!fingerprint.webgl) errors.push('Missing WebGL data');
    if (!fingerprint.screen) errors.push('Missing screen data');

    // Check canvas data
    if (fingerprint.canvas && !fingerprint.canvas.hash) {
      errors.push('Missing canvas hash');
    }

    // Check WebGL data
    if (fingerprint.webgl) {
      if (!fingerprint.webgl.vendor) errors.push('Missing WebGL vendor');
      if (!fingerprint.webgl.renderer) errors.push('Missing WebGL renderer');
    }

    // Check screen data
    if (fingerprint.screen) {
      if (fingerprint.screen.width <= 0) errors.push('Invalid screen width');
      if (fingerprint.screen.height <= 0) errors.push('Invalid screen height');
    }

    // Check consistency
    if (fingerprint.navigator && fingerprint.hardware) {
      if (fingerprint.navigator.userAgent !== fingerprint.hardware.userAgent) {
        errors.push('Inconsistent user agent');
      }
      if (fingerprint.navigator.language !== fingerprint.hardware.language) {
        errors.push('Inconsistent language');
      }
    }

    return errors;
  }

  /**
   * Calculate quality score (0-1)
   */
  private calculateQuality(fingerprint: Fingerprint): number {
    let score = 0;
    let maxScore = 0;

    // Check completeness of each component
    const components = [
      { data: fingerprint.canvas, weight: 1 },
      { data: fingerprint.webgl, weight: 1.5 }, // WebGL is more important
      { data: fingerprint.audio, weight: 1 },
      { data: fingerprint.fonts, weight: 0.5 },
      { data: fingerprint.screen, weight: 1 },
      { data: fingerprint.hardware, weight: 1 },
      { data: fingerprint.navigator, weight: 1 },
      { data: fingerprint.mediaDevices, weight: 0.5 },
      { data: fingerprint.battery, weight: 0.5 },
    ];

    components.forEach(({ data, weight }) => {
      maxScore += weight;
      if (data) {
        score += weight * this.calculateComponentQuality(data);
      }
    });

    return score / maxScore;
  }

  /**
   * Calculate quality of a component
   */
  private calculateComponentQuality(component: any): number {
    if (!component) return 0;

    let score = 0;
    let fields = 0;

    Object.keys(component).forEach((key) => {
      fields++;
      const value = component[key];
      if (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0)
      ) {
        score++;
      }
    });

    return fields > 0 ? score / fields : 0;
  }

  /**
   * Filter fingerprints by quality threshold
   */
  filterByQuality(minQuality: number): ParsedFingerprint[] {
    return this.parsedFingerprints.filter((fp) => fp.quality >= minQuality);
  }

  /**
   * Filter valid fingerprints only
   */
  filterValid(): ParsedFingerprint[] {
    return this.parsedFingerprints.filter((fp) => fp.validated);
  }

  /**
   * Get dataset statistics
   */
  getStats(): DatasetStats {
    const validFingerprints = this.filterValid();
    const sources: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    const os: Record<string, number> = {};
    const deviceTypes: Record<string, number> = {};

    let totalQuality = 0;
    let earliest = Infinity;
    let latest = 0;

    this.parsedFingerprints.forEach((fp) => {
      // Count sources
      sources[fp.source] = (sources[fp.source] || 0) + 1;

      // Count browsers
      browsers[fp.metadata.browserName] = (browsers[fp.metadata.browserName] || 0) + 1;

      // Count OS
      os[fp.metadata.osName] = (os[fp.metadata.osName] || 0) + 1;

      // Count device types
      deviceTypes[fp.metadata.deviceType] = (deviceTypes[fp.metadata.deviceType] || 0) + 1;

      // Sum quality
      totalQuality += fp.quality;

      // Track date range
      if (fp.timestamp < earliest) earliest = fp.timestamp;
      if (fp.timestamp > latest) latest = fp.timestamp;
    });

    return {
      totalFingerprints: this.parsedFingerprints.length,
      validFingerprints: validFingerprints.length,
      invalidFingerprints: this.parsedFingerprints.length - validFingerprints.length,
      sources,
      browsers,
      os,
      deviceTypes,
      averageQuality: totalQuality / this.parsedFingerprints.length,
      dateRange: {
        earliest: earliest === Infinity ? 0 : earliest,
        latest,
      },
    };
  }

  /**
   * Save parsed fingerprints to file
   */
  saveToFile(filePath: string): void {
    fs.writeFileSync(filePath, JSON.stringify(this.parsedFingerprints, null, 2));
    console.log(`💾 Saved ${this.parsedFingerprints.length} parsed fingerprints to ${filePath}`);
  }

  /**
   * Save statistics to file
   */
  saveStats(filePath: string): void {
    const stats = this.getStats();
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2));
    console.log(`📊 Saved statistics to ${filePath}`);
  }

  /**
   * Get parsed fingerprints
   */
  getParsedFingerprints(): ParsedFingerprint[] {
    return this.parsedFingerprints;
  }

  /**
   * Deduplicate fingerprints based on similarity
   */
  deduplicate(): ParsedFingerprint[] {
    console.log(`🔍 Deduplicating ${this.parsedFingerprints.length} fingerprints...`);

    const uniqueFingerprints: ParsedFingerprint[] = [];
    const seen = new Set<string>();

    this.parsedFingerprints.forEach((fp) => {
      const signature = this.createFingerprintSignature(fp);
      if (!seen.has(signature)) {
        seen.add(signature);
        uniqueFingerprints.push(fp);
      }
    });

    console.log(`✅ Removed ${this.parsedFingerprints.length - uniqueFingerprints.length} duplicates`);
    this.parsedFingerprints = uniqueFingerprints;
    return uniqueFingerprints;
  }

  /**
   * Create a unique signature for a fingerprint
   */
  private createFingerprintSignature(fp: Fingerprint): string {
    const parts = [
      fp.canvas.hash,
      fp.webgl.unmaskedRenderer,
      fp.screen.width,
      fp.screen.height,
      fp.hardware.hardwareConcurrency,
      fp.navigator.userAgent,
    ];
    return parts.join('|');
  }
}
