/**
 * Browser Types
 * Common type definitions for browser-related functionality
 */

export interface FingerprintProfile {
  canvas: {
    noise: number;
  };
  webgl: {
    vendor: string;
    renderer: string;
  };
  audio: {
    noise: number;
  };
  fonts: string[];
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  hardware: {
    cores: number;
    memory: number;
  };
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Geolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface BrowserConfig {
  headless?: boolean;
  args?: string[];
  userAgent?: string;
  viewport?: Viewport;
  geolocation?: Geolocation;
}

export interface PageConfig {
  userAgent?: string;
  viewport?: Viewport;
  timezone?: string;
  locale?: string;
  geolocation?: Geolocation;
}

export interface DetectionResult {
  passed: boolean;
  score: number;
  checks: Record<string, boolean>;
  warnings: string[];
}

export interface BotCheckResult {
  isBot: boolean;
  confidence: number;
  detections: string[];
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
