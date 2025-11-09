import { Page, Browser, HTTPRequest } from 'puppeteer';

export interface UndetectConfig {
  stealth?: StealthConfig;
  storage?: StorageConfig;
  pool?: BrowserPoolConfig;
}

export interface StealthConfig {
  level?: 'basic' | 'advanced' | 'paranoid';
  webdriverEvasion?: boolean;
  fingerprintSpoofing?: boolean;
  behavioralSimulation?: boolean;
  networkProtection?: boolean;
}

export interface StorageConfig {
  type: 'file' | 'memory' | 'database';
  path?: string;
  connectionString?: string;
}

export interface BrowserPoolConfig {
  min?: number;
  max?: number;
  acquireTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

export interface LaunchOptions {
  headless?: boolean;
  profileId?: string;
  profile?: ProfileOptions;
  proxy?: ProxyConfig;
  args?: string[];
  executablePath?: string;
}

export interface ProfileOptions {
  timezone?: string;
  locale?: string;
  geolocation?: GeolocationConfig;
  permissions?: Record<string, string>;
  userAgent?: string;
  viewport?: ViewportConfig;
}

export interface ProxyConfig {
  protocol: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  rotation?: 'per-session' | 'per-request';
}

export interface GeolocationConfig {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface BrowserProfile {
  id: string;
  fingerprint: FingerprintProfile;
  userAgent: string;
  viewport: ViewportConfig;
  timezone: string;
  locale: string;
  geolocation?: GeolocationConfig;
  permissions: Record<string, string>;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  createdAt: Date;
  lastUsed: Date;
}

export interface FingerprintProfile {
  canvas: CanvasProfile;
  webgl: WebGLProfile;
  audio: AudioProfile;
  fonts: string[];
  screen: ScreenProfile;
  hardware: HardwareProfile;
}

export interface CanvasProfile {
  noiseLevel: number;
}

export interface WebGLProfile {
  vendor: string;
  renderer: string;
}

export interface AudioProfile {
  frequencyVariation: number;
}

export interface ScreenProfile {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
}

export interface HardwareProfile {
  cores: number;
  memory: number;
}

export interface NetworkTimingProfile {
  dnsLookup: () => number;
  tcpConnect: () => number;
  tlsHandshake: () => number;
  ttfb: () => number;
}

export interface DetectionReport {
  timestamp: Date;
  totalTests: number;
  failedTests: number;
  details: TestResult[];
}

export interface TestResult {
  url: string;
  detections: string[];
}

export interface EvasionPatch {
  name: string;
  apply(page: Page): Promise<void>;
}

// Extend Page interface with human-like methods
declare module 'puppeteer' {
  interface Page {
    humanMove?(x: number, y: number): Promise<void>;
    humanClick?(selector: string): Promise<void>;
    humanType?(selector: string, text: string): Promise<void>;
    humanScroll?(options: { direction: 'up' | 'down'; distance?: number }): Promise<void>;
  }
}

export interface StealthEngine {
  initialize(): Promise<void>;
  applyProtections(page: Page): Promise<void>;
  updateFingerprint(): void;
  detectAndAdapt(): Promise<void>;
}

export interface ProfileManager {
  createProfile(options?: ProfileOptions): Promise<BrowserProfile>;
  loadProfile(profileId: string): Promise<BrowserProfile>;
  updateProfile(profileId: string, updates: Partial<BrowserProfile>): Promise<void>;
  deleteProfile(profileId: string): Promise<void>;
}

export interface BrowserPool {
  acquire(options?: LaunchOptions): Promise<Browser>;
  release(browser: Browser): Promise<void>;
  drain(): Promise<void>;
  clear(): Promise<void>;
}

export interface UndetectBrowserInstance {
  browser: Browser;
  profile: BrowserProfile;
  newPage(): Promise<Page>;
  close(): Promise<void>;
  saveProfile(): Promise<void>;
}
