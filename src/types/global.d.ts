/**
 * Global Type Declarations
 * Extends browser APIs with non-standard properties
 */

// Chrome browser types
interface ChromeRuntime {
  OnInstalledReason?: any;
  OnRestartRequiredReason?: any;
  PlatformArch?: any;
  PlatformNaclArch?: any;
  PlatformOs?: any;
  RequestUpdateCheckStatus?: any;
  id?: string;
  connect?: (extensionId?: string, connectInfo?: any) => any;
  sendMessage?: (extensionId: string, message: any, options?: any, responseCallback?: (response: any) => void) => void;
}

interface ChromeApp {
  isInstalled?: boolean;
  InstallState?: any;
  RunningState?: any;
  getDetails?: () => any;
  getIsInstalled?: () => boolean;
  installState?: (callback: (state: string) => void) => void;
  runningState?: () => string;
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

interface Chrome {
  loadTimes?: () => ChromeLoadTimes;
  csi?: () => ChromeCSI;
  app?: ChromeApp;
  runtime?: ChromeRuntime;
  webstore?: any;
}

// Network Information API
interface NetworkInformation extends EventTarget {
  readonly type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  readonly downlinkMax?: number;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
  onchange?: ((this: NetworkInformation, ev: Event) => any) | null;
}

// Battery Manager API
interface BatteryManager extends EventTarget {
  readonly charging: boolean;
  readonly chargingTime: number;
  readonly dischargingTime: number;
  readonly level: number;
  onchargingchange?: ((this: BatteryManager, ev: Event) => any) | null;
  onchargingtimechange?: ((this: BatteryManager, ev: Event) => any) | null;
  ondischargingtimechange?: ((this: BatteryManager, ev: Event) => any) | null;
  onlevelchange?: ((this: BatteryManager, ev: Event) => any) | null;
}

declare global {
  interface Window {
    chrome?: Chrome;
    lastMouseX?: number;
    lastMouseY?: number;
  }

  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
    webdriver?: boolean;
    deviceMemory?: number;
    hardwareConcurrency: number;
    keyboard?: {
      lock?: (keys?: string[]) => Promise<void>;
      unlock?: () => void;
      getLayoutMap?: () => Promise<any>;
    };
    scheduling?: {
      isInputPending?: (options?: any) => boolean;
    };
    userAgentData?: {
      brands: Array<{ brand: string; version: string }>;
      mobile: boolean;
      platform: string;
      getHighEntropyValues?: (hints: string[]) => Promise<any>;
    };
  }

  interface ErrorConstructor {
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
    prepareStackTrace?: (err: Error, structuredStackTrace: any[]) => any;
  }

  interface Error {
    stack?: string;
  }

  // Permissions API extension
  interface Permissions {
    query(permissionDesc: { name: string }): Promise<PermissionStatus>;
  }

  // WebGL extensions
  interface WebGLRenderingContext {
    getParameter(pname: number): any;
  }

  interface WebGL2RenderingContext {
    getParameter(pname: number): any;
  }
}

export {};
