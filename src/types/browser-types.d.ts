/**
 * Extended browser type definitions
 * Adds types for non-standard browser APIs used in evasion scripts
 */

interface Chrome {
  runtime?: {
    OnInstalledReason: any;
    OnRestartRequiredReason: any;
    PlatformArch: any;
    PlatformNaclArch: any;
    PlatformOs: any;
    RequestUpdateCheckStatus: any;
    [key: string]: any;
  };
  app?: {
    isInstalled: boolean;
    InstallState: any;
    RunningState: any;
    [key: string]: any;
  };
  [key: string]: any;
}

interface Window {
  chrome?: Chrome;
}

interface Navigator {
  getBattery?: () => Promise<any>;
}

interface Document {
  featurePolicy?: {
    allowsFeature: (feature: string) => boolean;
    [key: string]: any;
  };
}

interface StorageEstimate {
  usageDetails?: {
    [key: string]: number;
  };
}
