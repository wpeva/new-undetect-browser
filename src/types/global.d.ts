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
    lastMouseX?: number;
    lastMouseY?: number;
  }

  interface Navigator {
    getBattery?: () => Promise<any>;
    connection?: any;
    webdriver?: boolean;
  }

  interface ErrorConstructor {
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
    prepareStackTrace?: (err: Error, structuredStackTrace: any[]) => any;
  }

  interface Error {
    stack?: string;
  }
}

export {};
