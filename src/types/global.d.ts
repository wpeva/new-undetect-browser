/**
 * Global Type Declarations
 * Extends browser APIs with non-standard properties
 */

declare global {
  interface Window {
    chrome?: {
      loadTimes?: () => any;
      csi?: () => any;
      app?: any;
      runtime?: any;
    };
  }

  interface Navigator {
    getBattery?: () => Promise<any>;
    connection?: any;
  }
}

export {};
