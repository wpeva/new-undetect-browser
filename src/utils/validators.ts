/**
 * Input Validation Utilities
 * Provides comprehensive validation for all public API inputs
 */

import { ValidationError } from '../types/browser-types';

/**
 * Validates that a value is not null or undefined
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
}

/**
 * Validates that a string is not empty
 */
export function validateNonEmptyString(value: string, fieldName: string): void {
  validateRequired(value, fieldName);
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Validates that a number is within a valid range
 */
export function validateNumberRange(
  value: number,
  fieldName: string,
  min: number,
  max: number
): void {
  validateRequired(value, fieldName);
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}, got ${value}`
    );
  }
}

/**
 * Validates that a value is a positive number
 */
export function validatePositiveNumber(value: number, fieldName: string): void {
  validateRequired(value, fieldName);
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be positive, got ${value}`);
  }
}

/**
 * Validates viewport dimensions
 */
export function validateViewportDimensions(width: number, height: number): void {
  validateNumberRange(width, 'Viewport width', 320, 7680);
  validateNumberRange(height, 'Viewport height', 240, 4320);
}

/**
 * Validates device scale factor
 */
export function validateDeviceScaleFactor(scaleFactor: number): void {
  validateNumberRange(scaleFactor, 'Device scale factor', 0.5, 5);
}

/**
 * Validates user agent string
 */
export function validateUserAgent(userAgent: string): void {
  validateNonEmptyString(userAgent, 'User agent');
  if (userAgent.length > 1000) {
    throw new ValidationError(
      `User agent is too long (max 1000 characters, got ${userAgent.length})`
    );
  }
}

/**
 * Validates noise level (for fingerprinting)
 */
export function validateNoiseLevel(noise: number, fieldName: string): void {
  validateNumberRange(noise, fieldName, 0, 1);
}

/**
 * Validates timezone offset
 */
export function validateTimezoneOffset(offset: number): void {
  validateNumberRange(offset, 'Timezone offset', -720, 840); // -12h to +14h in minutes
}

/**
 * Validates hardware concurrency
 */
export function validateHardwareConcurrency(cores: number): void {
  validateNumberRange(cores, 'Hardware concurrency', 1, 128);
  if (!Number.isInteger(cores)) {
    throw new ValidationError('Hardware concurrency must be an integer');
  }
}

/**
 * Validates device memory in GB
 */
export function validateDeviceMemory(memory: number): void {
  const validMemory = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
  if (!validMemory.includes(memory)) {
    throw new ValidationError(
      `Device memory must be one of: ${validMemory.join(', ')} GB, got ${memory}`
    );
  }
}

/**
 * Validates array is not empty
 */
export function validateNonEmptyArray<T>(
  array: T[],
  fieldName: string
): asserts array is [T, ...T[]] {
  validateRequired(array, fieldName);
  if (!Array.isArray(array)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
  if (array.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Validates object has required properties
 */
export function validateObjectHasProperties<T extends object>(
  obj: T,
  requiredProps: (keyof T)[],
  objectName: string
): void {
  validateRequired(obj, objectName);
  if (typeof obj !== 'object') {
    throw new ValidationError(`${objectName} must be an object`);
  }

  for (const prop of requiredProps) {
    if (!(prop in obj)) {
      throw new ValidationError(
        `${objectName} is missing required property: ${String(prop)}`
      );
    }
  }
}

/**
 * Validates URL string
 */
export function validateUrl(url: string, fieldName: string = 'URL'): void {
  validateNonEmptyString(url, fieldName);
  try {
    new URL(url);
  } catch {
    throw new ValidationError(`${fieldName} is not a valid URL: ${url}`);
  }
}

/**
 * Validates color depth
 */
export function validateColorDepth(depth: number): void {
  const validDepths = [1, 4, 8, 15, 16, 24, 32, 48];
  if (!validDepths.includes(depth)) {
    throw new ValidationError(
      `Color depth must be one of: ${validDepths.join(', ')}, got ${depth}`
    );
  }
}

/**
 * Validates screen dimensions
 */
export function validateScreenDimensions(width: number, height: number): void {
  validateNumberRange(width, 'Screen width', 320, 7680);
  validateNumberRange(height, 'Screen height', 240, 4320);
}

/**
 * Validates language code (basic check)
 */
export function validateLanguageCode(lang: string): void {
  validateNonEmptyString(lang, 'Language code');
  // Basic check for language code format (e.g., 'en', 'en-US')
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(lang)) {
    throw new ValidationError(
      `Language code must be in format 'xx' or 'xx-XX', got ${lang}`
    );
  }
}

/**
 * Validates platform string
 */
export function validatePlatform(platform: string): void {
  validateNonEmptyString(platform, 'Platform');
  const validPlatforms = [
    'Win32',
    'Win64',
    'Windows',
    'MacIntel',
    'MacPPC',
    'Mac68K',
    'Linux x86_64',
    'Linux i686',
    'Linux armv7l',
    'Linux aarch64',
    'iPhone',
    'iPad',
    'iPod',
    'Android',
  ];

  if (!validPlatforms.includes(platform)) {
    throw new ValidationError(
      `Platform must be one of: ${validPlatforms.join(', ')}, got ${platform}`
    );
  }
}

/**
 * Validates retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
}

export function validateRetryConfig(config: RetryConfig): void {
  validateRequired(config, 'Retry config');
  validateNumberRange(config.maxAttempts, 'Max retry attempts', 1, 10);
  validateNumberRange(config.delayMs, 'Retry delay', 0, 60000);

  if (config.backoffMultiplier !== undefined) {
    validateNumberRange(config.backoffMultiplier, 'Backoff multiplier', 1, 10);
  }
}
