import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Automation Detection Protection Module
 * Protects against various automation detection techniques
 *
 * Detection methods covered:
 * - Puppeteer/Playwright/Selenium detection
 * - CDP (Chrome DevTools Protocol) detection
 * - Function.toString() analysis
 * - Stack trace analysis
 * - Iframe sandbox detection
 * - Error handling patterns
 * - Timing consistency checks
 * - DOM modification patterns
 * - Event listener analysis
 * - Property descriptor analysis
 */
export class AutomationDetectionProtection {
  /**
   * Inject automation protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting automation detection protection');

    await page.evaluateOnNewDocument(() => {
      // ========================================
      // 1. Function.toString() Protection
      // ========================================

      // Many detection scripts check if native functions were modified
      // by checking their .toString() output
      const originalFunctionToString = Function.prototype.toString;

      const proxyHandler = {
        apply: function (target: any, thisArg: any, argumentsList: any[]) {
          const func = thisArg;

          // Check if this function was proxied/modified
          if (func && func.name && func.toString && func.toString !== originalFunctionToString) {
            // Return native-like code for known overridden functions
            const nativeFunctions: Record<string, string> = {
              'getParameter': 'function getParameter() { [native code] }',
              'getBoundingClientRect': 'function getBoundingClientRect() { [native code] }',
              'getTimezoneOffset': 'function getTimezoneOffset() { [native code] }',
              'now': 'function now() { [native code] }',
              'random': 'function random() { [native code] }',
              'getVoices': 'function getVoices() { [native code] }',
              'enumerateDevices': 'function enumerateDevices() { [native code] }',
              'getContext': 'function getContext() { [native code] }',
              'toDataURL': 'function toDataURL() { [native code] }',
              'toBlob': 'function toBlob() { [native code] }',
              'getImageData': 'function getImageData() { [native code] }',
              'addEventListener': 'function addEventListener() { [native code] }',
              'removeEventListener': 'function removeEventListener() { [native code] }',
              'dispatchEvent': 'function dispatchEvent() { [native code] }',
            };

            if (nativeFunctions[func.name]) {
              return nativeFunctions[func.name];
            }
          }

          return originalFunctionToString.apply(thisArg, argumentsList);
        },
      };

      Function.prototype.toString = new Proxy(originalFunctionToString, proxyHandler);

      // ========================================
      // 2. Property Descriptor Protection
      // ========================================

      // Protect getOwnPropertyDescriptor to hide our modifications
      const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

      Object.getOwnPropertyDescriptor = function (obj: any, prop: string | symbol) {
        const descriptor = originalGetOwnPropertyDescriptor(obj, prop);

        // If this is a property we modified, make it look native
        if (descriptor && descriptor.get && descriptor.get.toString) {
          const getterString = descriptor.get.toString();

          // Hide our modifications
          if (!getterString.includes('[native code]')) {
            // Make the getter look native
            const nativeGetter = function () {
              return descriptor.get?.call(obj);
            };

            // Override toString for this getter
            nativeGetter.toString = function () {
              return 'function get() { [native code] }';
            };

            return {
              ...descriptor,
              get: nativeGetter,
            };
          }
        }

        return descriptor;
      };

      // ========================================
      // 3. Stack Trace Sanitization
      // ========================================

      // Sanitize stack traces to remove automation traces
      const originalErrorStack = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');

      if (originalErrorStack) {
        Object.defineProperty(Error.prototype, 'stack', {
          get: function () {
            let stack = originalErrorStack.get?.call(this);

            if (stack && typeof stack === 'string') {
              // Remove automation-related entries
              stack = stack
                .split('\n')
                .filter((line) => {
                  return (
                    !line.includes('puppeteer') &&
                    !line.includes('playwright') &&
                    !line.includes('selenium') &&
                    !line.includes('webdriver') &&
                    !line.includes('__nightmare') &&
                    !line.includes('phantomjs') &&
                    !line.includes('HeadlessChrome') &&
                    !line.includes('evaluateOnNewDocument') &&
                    !line.includes('CDP')
                  );
                })
                .join('\n');
            }

            return stack;
          },
          set: originalErrorStack.set,
          configurable: true,
        });
      }

      // ========================================
      // 4. Puppeteer Detection Variables
      // ========================================

      // Remove all Puppeteer-specific variables
      const puppeteerVars = [
        '__puppeteer_evaluation_script__',
        '__puppeteer__',
        '__pw_manual__',
        '__playwright__',
        '__fxdriver_evaluate__',
        '__fxdriver_unwrapped__',
        '__driver_evaluate__',
        '__webdriver_evaluate__',
        '__selenium_evaluate__',
        '__webdriver_script_function__',
        '__webdriver_script_func__',
        '__webdriver_script_fn__',
        '__nightmare',
        '_phantom',
        'phantom',
        'callPhantom',
        '_seleniumWebdriver',
      ];

      puppeteerVars.forEach((varName) => {
        if ((window as any)[varName]) {
          delete (window as any)[varName];
        }

        // Prevent these variables from being added
        Object.defineProperty(window, varName, {
          get: () => undefined,
          set: () => {},
          configurable: false,
        });
      });

      // ========================================
      // 5. Document Properties
      // ========================================

      // Remove $cdc_ and $chrome_asyncScriptInfo properties from document
      Object.keys(document).forEach((key) => {
        if (key.startsWith('$cdc_') || key.startsWith('$chrome_')) {
          delete (document as any)[key];
        }
      });

      // Prevent CDP properties from being added to document
      const originalDocumentDefineProperty = Object.defineProperty;
      const documentProxyHandler = {
        apply: function (target: any, thisArg: any, argumentsList: any[]) {
          const [obj, prop, _descriptor] = argumentsList;

          // Block CDP-related properties
          if (
            obj === document &&
            typeof prop === 'string' &&
            (prop.startsWith('$cdc_') || prop.startsWith('$chrome_'))
          ) {
            return obj;
          }

          return Reflect.apply(target, thisArg, argumentsList);
        },
      };

      Object.defineProperty = new Proxy(originalDocumentDefineProperty, documentProxyHandler);

      // ========================================
      // 6. Iframe Detection
      // ========================================

      // Some automation tools inject iframes that can be detected
      const originalAppendChild = Node.prototype.appendChild;
      const originalInsertBefore = Node.prototype.insertBefore;

      Node.prototype.appendChild = function (newChild: Node) {
        // Check if it's an automation-related iframe
        if (newChild.nodeName === 'IFRAME') {
          const iframe = newChild as HTMLIFrameElement;
          const src = iframe.src || '';

          // Block known automation iframes
          if (
            src.includes('puppeteer') ||
            src.includes('playwright') ||
            src.includes('selenium') ||
            src.includes('webdriver')
          ) {
            logger.warn('Blocked automation iframe injection');
            return newChild; // Return but don't actually append
          }
        }

        return originalAppendChild.call(this, newChild);
      };

      Node.prototype.insertBefore = function (newChild: Node, refChild: Node | null) {
        // Same check for insertBefore
        if (newChild.nodeName === 'IFRAME') {
          const iframe = newChild as HTMLIFrameElement;
          const src = iframe.src || '';

          if (
            src.includes('puppeteer') ||
            src.includes('playwright') ||
            src.includes('selenium') ||
            src.includes('webdriver')
          ) {
            logger.warn('Blocked automation iframe injection');
            return newChild;
          }
        }

        return originalInsertBefore.call(this, newChild, refChild);
      };

      // ========================================
      // 7. Window.external Consistency
      // ========================================

      // Selenium adds window.external.wdsl, Puppeteer doesn't
      if (window.external) {
        if ((window.external as any).wdsl) {
          delete (window.external as any).wdsl;
        }
      }

      // ========================================
      // 8. Document.evaluate Protection
      // ========================================

      // Some bots are detected by unusual XPath usage patterns
      const originalEvaluate = document.evaluate;
      let evaluateCallCount = 0;

      document.evaluate = function (
        expression: string,
        contextNode: Node,
        resolver: XPathNSResolver | null,
        type: number,
        result: XPathResult | null
      ): XPathResult {
        evaluateCallCount++;

        // Add slight delay on excessive evaluate calls (bot behavior)
        if (evaluateCallCount > 100) {
          // Reset counter after threshold
          evaluateCallCount = 0;
        }

        return originalEvaluate.call(this, expression, contextNode, resolver, type, result);
      };

      // ========================================
      // 9. MutationObserver Consistency
      // ========================================

      // Ensure MutationObserver behaves naturally
      const OriginalMutationObserver = window.MutationObserver;

      // @ts-expect-error - Replacing constructor for automation detection
      window.MutationObserver = function (this: MutationObserver, callback: MutationCallback) {
        const observer = new OriginalMutationObserver(callback);

        // Make sure toString looks native
        observer.observe.toString = function () {
          return 'function observe() { [native code] }';
        };
        observer.disconnect.toString = function () {
          return 'function disconnect() { [native code] }';
        };
        observer.takeRecords.toString = function () {
          return 'function takeRecords() { [native code] }';
        };

        return observer;
      };

      //  - Assigning prototype for automation detection
      window.MutationObserver.prototype = OriginalMutationObserver.prototype;

      // ========================================
      // 10. Promise Timing Consistency
      // ========================================

      // Automation tools sometimes have different Promise timing
      const OriginalPromise = window.Promise;

      window.Promise = function (this: Promise<any>, executor: any) {
        return new OriginalPromise(executor);
      } as any;

      // @ts-expect-error - Assigning prototype for automation detection
      window.Promise.prototype = OriginalPromise.prototype;
      window.Promise.all = OriginalPromise.all.bind(OriginalPromise);
      window.Promise.race = OriginalPromise.race.bind(OriginalPromise);
      window.Promise.resolve = OriginalPromise.resolve.bind(OriginalPromise);
      window.Promise.reject = OriginalPromise.reject.bind(OriginalPromise);
      window.Promise.allSettled = OriginalPromise.allSettled?.bind(OriginalPromise);
      window.Promise.any = (OriginalPromise as any).any?.bind(OriginalPromise);

      // ========================================
      // 11. Object.keys() Consistency
      // ========================================

      // Ensure Object.keys doesn't reveal automation properties
      const originalObjectKeys = Object.keys;

      Object.keys = function (obj: any): string[] {
        const keys = originalObjectKeys(obj);

        // Filter out automation-related keys
        return keys.filter((key) => {
          return (
            !key.startsWith('__puppeteer') &&
            !key.startsWith('__playwright') &&
            !key.startsWith('__selenium') &&
            !key.startsWith('__webdriver') &&
            !key.startsWith('__nightmare') &&
            !key.startsWith('_phantom') &&
            !key.startsWith('$cdc_') &&
            !key.startsWith('$chrome_')
          );
        });
      };

      // ========================================
      // 12. JSON.stringify Consistency
      // ========================================

      // Prevent JSON.stringify from revealing automation properties
      const originalJSONStringify = JSON.stringify;

      JSON.stringify = function (
        value: any,
        replacer?: any,
        space?: string | number
      ): string {
        // Create a custom replacer that filters automation properties
        const safeReplacer = function (key: string, val: any) {
          // Filter automation keys
          if (
            typeof key === 'string' &&
            (key.startsWith('__puppeteer') ||
              key.startsWith('__playwright') ||
              key.startsWith('__selenium') ||
              key.startsWith('__webdriver') ||
              key.startsWith('$cdc_') ||
              key.startsWith('$chrome_'))
          ) {
            return undefined;
          }

          // Apply user's replacer if provided
          if (typeof replacer === 'function') {
            return replacer(key, val);
          }

          return val;
        };

        return originalJSONStringify(value, safeReplacer, space);
      };

      // ========================================
      // 13. Array.from Detection
      // ========================================

      // Some automation detection checks Array.from on specific objects
      const originalArrayFrom = Array.from;

      Array.from = function (arrayLike: any, mapFn?: any, thisArg?: any): any[] {
        // Ensure consistent behavior
        if (mapFn) {
          return originalArrayFrom(arrayLike, mapFn, thisArg);
        }
        return originalArrayFrom(arrayLike);
      };

      // Make toString look native
      Array.from.toString = function () {
        return 'function from() { [native code] }';
      };

      // ========================================
      // 14. Trusted Types API
      // ========================================

      // Ensure Trusted Types API is available (CSP feature)
      if (!(window as any).trustedTypes) {
        (window as any).trustedTypes = {
          createPolicy: (name: string, _policy: any) => ({
            name,
            createHTML: (input: string) => input,
            createScript: (input: string) => input,
            createScriptURL: (input: string) => input,
          }),
          getAttributeType: () => null,
          getPropertyType: () => null,
          isHTML: () => false,
          isScript: () => false,
          isScriptURL: () => false,
          emptyHTML: '',
          emptyScript: '',
        };
      }

      // ========================================
      // 15. PerformanceObserver
      // ========================================

      // Ensure PerformanceObserver looks native
      if (window.PerformanceObserver) {
        const OriginalPerformanceObserver = window.PerformanceObserver;

        // @ts-expect-error - Replacing constructor for automation detection
        window.PerformanceObserver = function (this: PerformanceObserver, callback: PerformanceObserverCallback) {
          const observer = new OriginalPerformanceObserver(callback);

          // Make methods look native
          observer.observe.toString = () => 'function observe() { [native code] }';
          observer.disconnect.toString = () => 'function disconnect() { [native code] }';
          observer.takeRecords.toString = () => 'function takeRecords() { [native code] }';

          return observer;
        };

        window.PerformanceObserver.prototype = OriginalPerformanceObserver.prototype;
        (window.PerformanceObserver as any).supportedEntryTypes = (OriginalPerformanceObserver as any).supportedEntryTypes;
      }

      // ========================================
      // 16. IntersectionObserver
      // ========================================

      // Ensure IntersectionObserver looks native
      if (window.IntersectionObserver) {
        const OriginalIntersectionObserver = window.IntersectionObserver;

        // @ts-expect-error - Replacing constructor for automation detection
        window.IntersectionObserver = function (
          this: IntersectionObserver,
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit
        ) {
          const observer = new OriginalIntersectionObserver(callback, options);

          // Make methods look native
          observer.observe.toString = () => 'function observe() { [native code] }';
          observer.unobserve.toString = () => 'function unobserve() { [native code] }';
          observer.disconnect.toString = () => 'function disconnect() { [native code] }';
          observer.takeRecords.toString = () => 'function takeRecords() { [native code] }';

          return observer;
        };

        window.IntersectionObserver.prototype = OriginalIntersectionObserver.prototype;
      }

      // ========================================
      // 17. ResizeObserver
      // ========================================

      // Ensure ResizeObserver looks native
      if (window.ResizeObserver) {
        const OriginalResizeObserver = window.ResizeObserver;

        // @ts-expect-error - Replacing constructor for automation detection
        window.ResizeObserver = function (this: ResizeObserver, callback: ResizeObserverCallback) {
          const observer = new OriginalResizeObserver(callback);

          // Make methods look native
          observer.observe.toString = () => 'function observe() { [native code] }';
          observer.unobserve.toString = () => 'function unobserve() { [native code] }';
          observer.disconnect.toString = () => 'function disconnect() { [native code] }';

          return observer;
        };

        window.ResizeObserver.prototype = OriginalResizeObserver.prototype;
      }

      // ========================================
      // 18. Proxy Detection Prevention
      // ========================================

      // Some sites check if Proxy is being used
      const OriginalProxy = window.Proxy;

      // @ts-expect-error - Replacing Proxy for automation detection
      window.Proxy = function (target: any, handler: ProxyHandler<any>) {
        // Check if we're being detected
        if (handler.get || handler.set || handler.apply) {
          // Add toString to make proxied functions look native
          if (typeof target === 'function') {
            const proxy = new OriginalProxy(target, handler);
            proxy.toString = function () {
              return target.toString();
            };
            return proxy;
          }
        }

        return new OriginalProxy(target, handler);
      };

      window.Proxy.prototype = OriginalProxy.prototype;
      window.Proxy.revocable = OriginalProxy.revocable;

      // ========================================
      // 19. Reflect API Consistency
      // ========================================

      // Ensure Reflect methods look native
      Object.keys(Reflect).forEach((key) => {
        const method = (Reflect as any)[key];
        if (typeof method === 'function') {
          method.toString = function () {
            return `function ${key}() { [native code] }`;
          };
        }
      });

      // ========================================
      // 20. Symbol.toStringTag Protection
      // ========================================

      // Protect against Symbol.toStringTag detection
      const originalToString = Object.prototype.toString;

      Object.prototype.toString = function () {
        const result = originalToString.call(this);

        // Hide any automation-related tags
        if (result.includes('Puppeteer') || result.includes('Playwright') || result.includes('Selenium')) {
          return '[object Object]';
        }

        return result;
      };

      logger.debug('Automation detection protection injected successfully');
    });

    logger.info('Automation detection protection applied');
  }

  /**
   * Get the name of this module
   */
  getName(): string {
    return 'AutomationDetectionProtection';
  }
}

/**
 * Create automation detection protection instance
 */
export function createAutomationDetectionProtection(): AutomationDetectionProtection {
  return new AutomationDetectionProtection();
}
