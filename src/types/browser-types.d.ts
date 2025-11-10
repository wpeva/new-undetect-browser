/**
 * Extended browser type definitions
 * Adds types for non-standard browser APIs used in evasion scripts
 */

// Chrome Runtime Types
interface ChromeOnInstalledReason {
  CHROME_UPDATE: string;
  INSTALL: string;
  SHARED_MODULE_UPDATE: string;
  UPDATE: string;
}

interface ChromeOnRestartRequiredReason {
  APP_UPDATE: string;
  OS_UPDATE: string;
  PERIODIC: string;
}

interface ChromePlatformArch {
  ARM: string;
  ARM64: string;
  MIPS: string;
  MIPS64: string;
  X86_32: string;
  X86_64: string;
}

interface ChromePlatformNaclArch {
  ARM: string;
  MIPS: string;
  MIPS64: string;
  X86_32: string;
  X86_64: string;
}

interface ChromePlatformOs {
  ANDROID: string;
  CROS: string;
  LINUX: string;
  MAC: string;
  OPENBSD: string;
  WIN: string;
}

interface ChromeRequestUpdateCheckStatus {
  NO_UPDATE: string;
  THROTTLED: string;
  UPDATE_AVAILABLE: string;
}

interface ChromeRuntime {
  OnInstalledReason: ChromeOnInstalledReason;
  OnRestartRequiredReason: ChromeOnRestartRequiredReason;
  PlatformArch: ChromePlatformArch;
  PlatformNaclArch: ChromePlatformNaclArch;
  PlatformOs: ChromePlatformOs;
  RequestUpdateCheckStatus: ChromeRequestUpdateCheckStatus;
}

interface ChromeInstallState {
  DISABLED: string;
  INSTALLED: string;
  NOT_INSTALLED: string;
}

interface ChromeRunningState {
  CANNOT_RUN: string;
  READY_TO_RUN: string;
  RUNNING: string;
}

interface ChromeApp {
  isInstalled: boolean;
  InstallState: ChromeInstallState;
  RunningState: ChromeRunningState;
}

interface Chrome {
  runtime?: ChromeRuntime;
  app?: ChromeApp;
  loadTimes?: () => ChromeLoadTimes;
  csi?: () => ChromeCSI;
}

interface ChromeLoadTimes {
  requestTime: number;
  startLoadTime: number;
  commitLoadTime: number;
  finishDocumentLoadTime: number;
  finishLoadTime: number;
  firstPaintTime: number;
  firstPaintAfterLoadTime: number;
  navigationType: string;
  wasFetchedViaSpdy: boolean;
  wasNpnNegotiated: boolean;
  npnNegotiatedProtocol: string;
  wasAlternateProtocolAvailable: boolean;
  connectionInfo: string;
}

interface ChromeCSI {
  startE: number;
  onloadT: number;
  pageT: number;
  tran: number;
}

// Battery API Types
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => unknown) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => unknown) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => unknown) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => unknown) | null;
}

// Feature Policy Types
interface FeaturePolicy {
  allowsFeature: (feature: string) => boolean;
  features: () => string[];
  allowedFeatures: () => string[];
  getAllowlistForFeature: (feature: string) => string[];
}

// Media Device Info with toJSON
interface MediaDeviceInfoJSON {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

// WebGL Debug Info
interface WebGLDebugRendererInfo {
  readonly UNMASKED_VENDOR_WEBGL: number;
  readonly UNMASKED_RENDERER_WEBGL: number;
}

// VisibilityState type
type VisibilityState = 'visible' | 'hidden' | 'prerender';

// Connection Info Types
type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

interface NetworkInformation extends EventTarget {
  readonly type?: ConnectionType;
  readonly effectiveType?: EffectiveConnectionType;
  readonly downlinkMax?: number;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
  onchange: ((this: NetworkInformation, ev: Event) => unknown) | null;
}

type GamepadMappingType = '' | 'standard';

// Global augmentation
declare global {
  // Extended Window interface
  interface Window {
    chrome?: Chrome;
  }

  // Extended Navigator interface
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
    keyboard?: {
      lock?: (keys?: string[]) => Promise<void>;
      unlock?: () => void;
    };
  }

  // Extended Document interface
  interface Document {
    featurePolicy?: FeaturePolicy;
  }

  // Storage Estimate with usage details
  interface StorageEstimate {
    quota?: number;
    usage?: number;
    usageDetails?: {
      [key: string]: number;
    };
  }

  // Media Device Info with toJSON
  interface MediaDeviceInfo {
    toJSON?: () => MediaDeviceInfoJSON;
  }

  // Oscillator Types
  interface OscillatorNode {
    frequency: AudioParam;
    detune: AudioParam;
    type: OscillatorType;
    start: (when?: number) => void;
    stop: (when?: number) => void;
    onended: ((this: OscillatorNode, ev: Event) => unknown) | null;
  }

  // Permissions API Types
  interface PermissionStatus {
    readonly name: PermissionName;
    readonly state: PermissionState;
    onchange: ((this: PermissionStatus, ev: Event) => unknown) | null;
  }

  // Screen Orientation Types
  interface ScreenOrientation {
    readonly type: OrientationType;
    readonly angle: number;
    lock: (orientation: OrientationLockType) => Promise<void>;
    unlock: () => void;
    onchange: ((this: ScreenOrientation, ev: Event) => unknown) | null;
  }

  // Visual Viewport Types
  interface VisualViewport {
    readonly offsetLeft: number;
    readonly offsetTop: number;
    readonly pageLeft: number;
    readonly pageTop: number;
    readonly width: number;
    readonly height: number;
    readonly scale: number;
    onresize: ((this: VisualViewport, ev: Event) => unknown) | null;
    onscroll: ((this: VisualViewport, ev: Event) => unknown) | null;
  }

  // Speech Synthesis Types
  interface SpeechSynthesisVoice {
    readonly voiceURI: string;
    readonly name: string;
    readonly lang: string;
    readonly localService: boolean;
    readonly default: boolean;
  }

  // Performance API Types
  interface PerformanceEntry {
    toJSON?: () => Record<string, unknown>;
  }

  // Gamepad Types
  interface Gamepad {
    readonly mapping: GamepadMappingType;
  }

  // WebGL Extensions
  interface WebGLRenderingContext {
    readonly UNMASKED_VENDOR_WEBGL: number;
    readonly UNMASKED_RENDERER_WEBGL: number;
  }
}

// Helper Types for Fingerprinting
// FingerprintProfile is defined in src/utils/fingerprint-generator.ts

export interface ViewportProfile {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscape: boolean;
}

// Error Types
export class UndetectError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'UndetectError';
  }
}

export class ProfileError extends UndetectError {
  constructor(message: string) {
    super(message, 'PROFILE_ERROR');
    this.name = 'ProfileError';
  }
}

export class InjectionError extends UndetectError {
  constructor(message: string) {
    super(message, 'INJECTION_ERROR');
    this.name = 'InjectionError';
  }
}

export class ValidationError extends UndetectError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
