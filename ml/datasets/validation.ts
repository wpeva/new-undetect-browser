/**
 * ML Fingerprint Validation
 * Session 9: Machine Learning Dataset Collection
 *
 * Validates consistency and quality of fingerprint datasets
 */

import * as fs from 'fs';
import { Fingerprint, ValidationResult, ParsedFingerprint } from '../types/fingerprint';

export class FingerprintValidator {
  /**
   * Validate a single fingerprint
   */
  validateFingerprint(fingerprint: Fingerprint): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    this.validateRequiredFields(fingerprint, errors);

    // Check data consistency
    this.validateConsistency(fingerprint, errors, warnings);

    // Check data quality
    this.validateQuality(fingerprint, warnings);

    // Check realistic values
    this.validateRealisticValues(fingerprint, errors, warnings);

    const quality = this.calculateQualityScore(fingerprint, errors, warnings);
    const consistency = this.calculateConsistencyScore(fingerprint, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      quality,
      consistency,
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(fingerprint: Fingerprint, errors: string[]): void {
    if (!fingerprint.id) errors.push('Missing fingerprint ID');
    if (!fingerprint.timestamp) errors.push('Missing timestamp');
    if (!fingerprint.source) errors.push('Missing source');

    // Canvas validation
    if (!fingerprint.canvas) {
      errors.push('Missing canvas fingerprint');
    } else {
      if (!fingerprint.canvas.hash) errors.push('Missing canvas hash');
      if (!fingerprint.canvas.parameters) errors.push('Missing canvas parameters');
    }

    // WebGL validation
    if (!fingerprint.webgl) {
      errors.push('Missing WebGL fingerprint');
    } else {
      if (!fingerprint.webgl.vendor) errors.push('Missing WebGL vendor');
      if (!fingerprint.webgl.renderer) errors.push('Missing WebGL renderer');
      if (!fingerprint.webgl.extensions || fingerprint.webgl.extensions.length === 0) {
        errors.push('Missing WebGL extensions');
      }
    }

    // Screen validation
    if (!fingerprint.screen) {
      errors.push('Missing screen fingerprint');
    } else {
      if (fingerprint.screen.width <= 0) errors.push('Invalid screen width');
      if (fingerprint.screen.height <= 0) errors.push('Invalid screen height');
    }

    // Hardware validation
    if (!fingerprint.hardware) {
      errors.push('Missing hardware fingerprint');
    } else {
      if (!fingerprint.hardware.userAgent) errors.push('Missing user agent');
      if (fingerprint.hardware.hardwareConcurrency <= 0) {
        errors.push('Invalid hardware concurrency');
      }
    }

    // Navigator validation
    if (!fingerprint.navigator) {
      errors.push('Missing navigator fingerprint');
    } else {
      if (!fingerprint.navigator.userAgent) errors.push('Missing navigator user agent');
    }

    // Metadata validation
    if (!fingerprint.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!fingerprint.metadata.browserName) errors.push('Missing browser name');
      if (!fingerprint.metadata.osName) errors.push('Missing OS name');
    }
  }

  /**
   * Validate data consistency
   */
  private validateConsistency(
    fingerprint: Fingerprint,
    errors: string[],
    warnings: string[]
  ): void {
    // User agent consistency
    if (fingerprint.navigator && fingerprint.hardware) {
      if (fingerprint.navigator.userAgent !== fingerprint.hardware.userAgent) {
        errors.push('Navigator and hardware user agents do not match');
      }
    }

    // Language consistency
    if (fingerprint.navigator && fingerprint.hardware) {
      if (fingerprint.navigator.language !== fingerprint.hardware.language) {
        warnings.push('Navigator and hardware languages do not match');
      }
    }

    // Hardware concurrency consistency
    if (fingerprint.navigator && fingerprint.hardware) {
      if (
        fingerprint.navigator.hardwareConcurrency !== fingerprint.hardware.hardwareConcurrency
      ) {
        errors.push('Navigator and hardware concurrency do not match');
      }
    }

    // Device memory consistency
    if (fingerprint.navigator && fingerprint.hardware) {
      if (
        fingerprint.navigator.deviceMemory !== undefined &&
        fingerprint.hardware.deviceMemory !== undefined &&
        fingerprint.navigator.deviceMemory !== fingerprint.hardware.deviceMemory
      ) {
        errors.push('Navigator and hardware device memory do not match');
      }
    }

    // Max touch points consistency
    if (fingerprint.navigator && fingerprint.hardware && fingerprint.screen) {
      const navTouch = fingerprint.navigator.maxTouchPoints;
      const hwTouch = fingerprint.hardware.maxTouchPoints;
      const screenTouch = fingerprint.screen.touchSupport.maxTouchPoints;

      if (navTouch !== hwTouch || navTouch !== screenTouch) {
        warnings.push('Inconsistent max touch points across sources');
      }
    }

    // Screen and device pixel ratio consistency
    if (fingerprint.screen) {
      const dpr = fingerprint.screen.devicePixelRatio;
      if (dpr <= 0 || dpr > 5) {
        warnings.push(`Unusual device pixel ratio: ${dpr}`);
      }
    }

    // Platform consistency with OS
    if (fingerprint.hardware && fingerprint.metadata) {
      const platform = fingerprint.hardware.platform.toLowerCase();
      const os = fingerprint.metadata.osName.toLowerCase();

      if (
        (platform.includes('win') && !os.includes('windows')) ||
        (platform.includes('mac') && !os.includes('mac')) ||
        (platform.includes('linux') && !os.includes('linux'))
      ) {
        warnings.push('Platform and OS name mismatch');
      }
    }
  }

  /**
   * Validate data quality
   */
  private validateQuality(fingerprint: Fingerprint, warnings: string[]): void {
    // Check for empty or missing optional fields
    if (!fingerprint.audio) {
      warnings.push('Missing audio fingerprint');
    }

    if (!fingerprint.fonts || fingerprint.fonts.availableFonts.length === 0) {
      warnings.push('No fonts detected');
    }

    if (!fingerprint.mediaDevices) {
      warnings.push('Missing media devices fingerprint');
    }

    if (!fingerprint.battery) {
      warnings.push('Missing battery fingerprint');
    }

    // Check font count
    if (fingerprint.fonts && fingerprint.fonts.fontCount < 5) {
      warnings.push('Very few fonts detected (possible headless browser)');
    }

    // Check WebGL extensions count
    if (fingerprint.webgl && fingerprint.webgl.extensions.length < 10) {
      warnings.push('Few WebGL extensions detected');
    }

    // Check plugins
    if (fingerprint.navigator && fingerprint.navigator.plugins.length === 0) {
      warnings.push('No browser plugins detected (possible headless browser)');
    }
  }

  /**
   * Validate realistic values
   */
  private validateRealisticValues(
    fingerprint: Fingerprint,
    errors: string[],
    warnings: string[]
  ): void {
    // Screen resolution
    if (fingerprint.screen) {
      const { width, height } = fingerprint.screen;

      // Common resolutions check
      const commonResolutions = [
        [1920, 1080],
        [1366, 768],
        [1440, 900],
        [1536, 864],
        [1280, 720],
        [2560, 1440],
        [3840, 2160],
      ];

      const isCommonResolution = commonResolutions.some(
        ([w, h]) => w === width && h === height
      );

      if (!isCommonResolution) {
        warnings.push(`Uncommon screen resolution: ${width}x${height}`);
      }

      // Unrealistic resolutions
      if (width < 800 || height < 600) {
        errors.push(`Unrealistic screen resolution: ${width}x${height}`);
      }

      if (width > 7680 || height > 4320) {
        warnings.push(`Very high screen resolution: ${width}x${height}`);
      }
    }

    // Hardware concurrency
    if (fingerprint.hardware) {
      const cores = fingerprint.hardware.hardwareConcurrency;
      if (cores < 1 || cores > 128) {
        errors.push(`Unrealistic hardware concurrency: ${cores}`);
      }
      if (cores > 32) {
        warnings.push(`Very high core count: ${cores}`);
      }
    }

    // Device memory
    if (fingerprint.hardware && fingerprint.hardware.deviceMemory !== undefined) {
      const memory = fingerprint.hardware.deviceMemory;
      const validMemory = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
      if (!validMemory.includes(memory)) {
        warnings.push(`Unusual device memory value: ${memory}GB`);
      }
    }

    // Color depth
    if (fingerprint.screen) {
      const validDepths = [8, 16, 24, 30, 32, 48];
      if (!validDepths.includes(fingerprint.screen.colorDepth)) {
        warnings.push(`Unusual color depth: ${fingerprint.screen.colorDepth}`);
      }
    }

    // Timezone offset
    if (fingerprint.hardware) {
      const offset = fingerprint.hardware.timezoneOffset;
      if (offset < -720 || offset > 720) {
        errors.push(`Invalid timezone offset: ${offset}`);
      }
    }

    // Canvas hash should not be empty
    if (fingerprint.canvas && fingerprint.canvas.hash === '0') {
      warnings.push('Canvas hash is zero (possible fingerprint blocking)');
    }

    // WebGL vendor and renderer
    if (fingerprint.webgl) {
      if (
        fingerprint.webgl.vendor === 'Brian Paul' &&
        fingerprint.webgl.renderer === 'Mesa OffScreen'
      ) {
        warnings.push('Software WebGL renderer detected (possible headless browser)');
      }
    }
  }

  /**
   * Calculate quality score (0-1)
   */
  private calculateQualityScore(
    fingerprint: Fingerprint,
    errors: string[],
    warnings: string[]
  ): number {
    let score = 1.0;

    // Penalize for errors
    score -= errors.length * 0.1;

    // Penalize for warnings
    score -= warnings.length * 0.05;

    // Bonus for completeness
    let completeness = 0;
    const components = [
      fingerprint.canvas,
      fingerprint.webgl,
      fingerprint.audio,
      fingerprint.fonts,
      fingerprint.screen,
      fingerprint.hardware,
      fingerprint.navigator,
      fingerprint.mediaDevices,
      fingerprint.battery,
    ];

    components.forEach((component) => {
      if (component) completeness++;
    });

    score += (completeness / components.length) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate consistency score (0-1)
   */
  private calculateConsistencyScore(fingerprint: Fingerprint, errors: string[]): number {
    // Count consistency-related errors
    const consistencyErrors = errors.filter(
      (error) =>
        error.includes('do not match') ||
        error.includes('mismatch') ||
        error.includes('inconsistent')
    );

    // Start with perfect score
    let score = 1.0;

    // Penalize for each consistency error
    score -= consistencyErrors.length * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Validate entire dataset
   */
  validateDataset(fingerprints: Fingerprint[]): {
    valid: number;
    invalid: number;
    warnings: number;
    results: ValidationResult[];
  } {
    console.log(`🔍 Validating dataset with ${fingerprints.length} fingerprints...`);

    const results: ValidationResult[] = [];
    let valid = 0;
    let invalid = 0;
    let totalWarnings = 0;

    fingerprints.forEach((fp, index) => {
      const result = this.validateFingerprint(fp);
      results.push(result);

      if (result.valid) {
        valid++;
      } else {
        invalid++;
      }

      totalWarnings += result.warnings.length;

      if ((index + 1) % 100 === 0) {
        console.log(`  Progress: ${index + 1}/${fingerprints.length}`);
      }
    });

    console.log(`✅ Validation complete:`);
    console.log(`  Valid: ${valid}`);
    console.log(`  Invalid: ${invalid}`);
    console.log(`  Total warnings: ${totalWarnings}`);

    return {
      valid,
      invalid,
      warnings: totalWarnings,
      results,
    };
  }

  /**
   * Save validation results
   */
  saveValidationResults(
    results: ValidationResult[],
    outputPath: string
  ): void {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Saved validation results to ${outputPath}`);
  }

  /**
   * Generate validation report
   */
  generateReport(results: ValidationResult[]): string {
    const valid = results.filter((r) => r.valid).length;
    const invalid = results.length - valid;
    const avgQuality =
      results.reduce((sum, r) => sum + r.quality, 0) / results.length;
    const avgConsistency =
      results.reduce((sum, r) => sum + r.consistency, 0) / results.length;

    const errorCounts: Record<string, number> = {};
    const warningCounts: Record<string, number> = {};

    results.forEach((result) => {
      result.errors.forEach((error) => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
      result.warnings.forEach((warning) => {
        warningCounts[warning] = (warningCounts[warning] || 0) + 1;
      });
    });

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const topWarnings = Object.entries(warningCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    let report = `# Fingerprint Validation Report\n\n`;
    report += `## Summary\n\n`;
    report += `- Total fingerprints: ${results.length}\n`;
    report += `- Valid: ${valid} (${((valid / results.length) * 100).toFixed(2)}%)\n`;
    report += `- Invalid: ${invalid} (${((invalid / results.length) * 100).toFixed(2)}%)\n`;
    report += `- Average quality: ${avgQuality.toFixed(3)}\n`;
    report += `- Average consistency: ${avgConsistency.toFixed(3)}\n\n`;

    report += `## Top Errors\n\n`;
    topErrors.forEach(([error, count]) => {
      report += `- ${error}: ${count} occurrences\n`;
    });

    report += `\n## Top Warnings\n\n`;
    topWarnings.forEach(([warning, count]) => {
      report += `- ${warning}: ${count} occurrences\n`;
    });

    return report;
  }

  /**
   * Save validation report
   */
  saveReport(results: ValidationResult[], outputPath: string): void {
    const report = this.generateReport(results);
    fs.writeFileSync(outputPath, report);
    console.log(`📄 Saved validation report to ${outputPath}`);
  }
}
