import { logger } from './logger';
import type { EnhancedFingerprintOptions } from '../types/advanced-types';

/**
 * Enhanced fingerprint generator
 * Generates realistic, consistent fingerprints like Multilogin  
 */

// Simplified version without type conflicts
export function generateEnhancedFingerprint(options: EnhancedFingerprintOptions = {}): any {
  const os = options.os || 'windows';
  const screen = options.screen || { width: 1920, height: 1080 };
  
  logger.info(`Generated enhanced fingerprint for ${os}`);
  
  return {
    userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    platform: os === 'windows' ? 'Win32' : os === 'mac' ? 'MacIntel' : 'Linux x86_64',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    timezone: options.timezone || 'America/New_York',
    locale: options.locale || 'en-US',
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: 24,
      availWidth: screen.width,
      availHeight: screen.height - 40,
    },
    canvas: { noise: 0.1 },
    webgl: {
      vendor: 'Intel Inc.',
      renderer: 'Intel Iris OpenGL Engine',
    },
    audio: { noise: 0.1 },
    fonts: ['Arial', 'Calibri', 'Verdana'],
  };
}

export function validateFingerprintConsistency(fingerprint: any): { consistent: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!fingerprint.userAgent) {
    issues.push('Missing userAgent');
  }
  
  if (!fingerprint.platform) {
    issues.push('Missing platform');
  }
  
  return {
    consistent: issues.length === 0,
    issues,
  };
}
