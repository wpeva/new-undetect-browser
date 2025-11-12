/**
 * ML Data Collection Types
 * Session 9: Machine Learning Dataset Collection
 */

export interface CanvasFingerprint {
  hash: string;
  imageData?: string;
  toDataURL?: string;
  parameters: {
    width: number;
    height: number;
    textRendering: string;
    fontFamily: string;
  };
}

export interface WebGLFingerprint {
  vendor: string;
  renderer: string;
  version: string;
  shadingLanguageVersion: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  extensions: string[];
  parameters: Record<string, any>;
  supportedExtensions: string[];
  maxTextureSize: number;
  maxViewportDims: number[];
  maxRenderbufferSize: number;
  aliasedLineWidthRange: number[];
  aliasedPointSizeRange: number[];
}

export interface AudioFingerprint {
  hash: string;
  oscillatorHash?: string;
  dynamicsCompressorHash?: string;
  sampleRate: number;
  channelCount: number;
  channelCountMode: string;
  channelInterpretation: string;
  latency: number;
  baseLatency?: number;
  outputLatency?: number;
}

export interface FontFingerprint {
  availableFonts: string[];
  fontCount: number;
  defaultFonts: string[];
  customFonts: string[];
}

export interface ScreenFingerprint {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  orientation: {
    angle: number;
    type: string;
  };
  devicePixelRatio: number;
  touchSupport: {
    maxTouchPoints: number;
    touchEvent: boolean;
    touchStart: boolean;
  };
}

export interface HardwareFingerprint {
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  cpuClass?: string;
  oscpu?: string;
  userAgent: string;
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number;
}

export interface NavigatorFingerprint {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  vendor: string;
  vendorSub: string;
  productSub: string;
  appVersion: string;
  appName: string;
  appCodeName: string;
  doNotTrack: string | null;
  cookieEnabled: boolean;
  plugins: Array<{
    name: string;
    description: string;
    filename: string;
    length: number;
  }>;
}

export interface MediaDevicesFingerprint {
  audioInputs: number;
  audioOutputs: number;
  videoInputs: number;
  deviceIds: string[];
  labels: string[];
}

export interface BatteryFingerprint {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

export interface Fingerprint {
  id: string;
  timestamp: number;
  source: string; // browserleaks, pixelscan, etc.
  canvas: CanvasFingerprint;
  webgl: WebGLFingerprint;
  audio: AudioFingerprint;
  fonts: FontFingerprint;
  screen: ScreenFingerprint;
  hardware: HardwareFingerprint;
  navigator: NavigatorFingerprint;
  mediaDevices?: MediaDevicesFingerprint;
  battery?: BatteryFingerprint;
  metadata: {
    userAgent: string;
    browserName: string;
    browserVersion: string;
    osName: string;
    osVersion: string;
    deviceType: string; // desktop, mobile, tablet
    isBot: boolean;
    consistency: number; // 0-1 score
  };
}

export interface ScraperConfig {
  count: number;
  sources: string[];
  userDataDirPrefix: string;
  headless: boolean;
  timeout: number;
  retries: number;
  delayBetweenRequests: number;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
}

export interface ParsedFingerprint extends Fingerprint {
  normalized: boolean;
  validated: boolean;
  validationErrors?: string[];
  quality: number; // 0-1 score based on completeness and consistency
}

export interface DatasetStats {
  totalFingerprints: number;
  validFingerprints: number;
  invalidFingerprints: number;
  sources: Record<string, number>;
  browsers: Record<string, number>;
  os: Record<string, number>;
  deviceTypes: Record<string, number>;
  averageQuality: number;
  dateRange: {
    earliest: number;
    latest: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  quality: number;
  consistency: number;
}
