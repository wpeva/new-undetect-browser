/**
 * ClientRects Protection Module
 *
 * Adds consistent noise to getBoundingClientRect() and getClientRects()
 * to prevent fingerprinting while maintaining consistency across calls.
 *
 * This is CRITICAL for passing:
 * - pixelscan.net
 * - creepjs.com
 * - incolumitas.com
 */

import type { Page } from 'puppeteer';

export interface ClientRectsConfig {
  enabled: boolean;
  noiseLevel: 'subtle' | 'moderate' | 'aggressive';
  seed: number;
  perDomainConsistency: boolean;
}

export class ClientRectsProtection {
  private config: ClientRectsConfig;

  constructor(config: Partial<ClientRectsConfig> = {}) {
    this.config = {
      enabled: true,
      noiseLevel: 'moderate',
      seed: Math.floor(Math.random() * 1000000),
      perDomainConsistency: true,
      ...config,
    };
  }

  /**
   * Apply ClientRects protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await page.evaluateOnNewDocument(this.getInjectionScript(), this.config);
  }

  /**
   * Get the injection script for ClientRects protection
   */
  private getInjectionScript() {
    return (config: ClientRectsConfig) => {
      // Seeded random number generator
      function seededRandom(seed: number, min: number, max: number): number {
        const x = Math.sin(seed++) * 10000;
        const random = x - Math.floor(x);
        return min + random * (max - min);
      }

      // Calculate noise level
      function getNoiseRange(level: string): number {
        switch (level) {
          case 'subtle':
            return 0.05; // ±0.05px
          case 'moderate':
            return 0.1; // ±0.1px
          case 'aggressive':
            return 0.2; // ±0.2px
          default:
            return 0.1;
        }
      }

      // Generate domain-specific seed
      function getDomainSeed(): number {
        if (!config.perDomainConsistency) {
          return config.seed;
        }

        const domain = window.location.hostname;
        let hash = 0;
        for (let i = 0; i < domain.length; i++) {
          const char = domain.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return config.seed + Math.abs(hash);
      }

      const domainSeed = getDomainSeed();
      const noiseRange = getNoiseRange(config.noiseLevel);

      // Cache for consistent noise per element
      const rectNoiseCache = new WeakMap<Element, DOMRect>();

      /**
       * Add consistent noise to a DOMRect
       */
      function addNoiseToRect(
        rect: DOMRect,
        element: Element,
        index: number = 0
      ): DOMRect {
        // Check cache first
        const cacheKey = element;
        if (rectNoiseCache.has(cacheKey)) {
          const cached = rectNoiseCache.get(cacheKey)!;
          return cached;
        }

        // Generate element-specific seed
        const elementPath = getElementPath(element);
        let elementSeed = domainSeed;
        for (let i = 0; i < elementPath.length; i++) {
          elementSeed += elementPath.charCodeAt(i);
        }
        elementSeed += index;

        // Generate noise
        const noise = {
          x: seededRandom(elementSeed, -noiseRange, noiseRange),
          y: seededRandom(elementSeed + 1, -noiseRange, noiseRange),
          width: seededRandom(elementSeed + 2, -noiseRange / 2, noiseRange / 2),
          height: seededRandom(elementSeed + 3, -noiseRange / 2, noiseRange / 2),
        };

        // Apply noise to rect
        const noisyRect = {
          x: rect.x + noise.x,
          y: rect.y + noise.y,
          width: Math.max(0, rect.width + noise.width),
          height: Math.max(0, rect.height + noise.height),
          top: rect.top + noise.y,
          right: rect.right + noise.x + noise.width,
          bottom: rect.bottom + noise.y + noise.height,
          left: rect.left + noise.x,
          toJSON: rect.toJSON,
        } as DOMRect;

        // Cache the result
        rectNoiseCache.set(cacheKey, noisyRect);

        return noisyRect;
      }

      /**
       * Get a unique path for an element
       */
      function getElementPath(element: Element): string {
        const path: string[] = [];
        let current: Element | null = element;

        while (current && current !== document.documentElement) {
          let selector = current.tagName.toLowerCase();

          if (current.id) {
            selector += `#${current.id}`;
          } else if (current.className) {
            const classes = Array.from(current.classList).join('.');
            if (classes) {
              selector += `.${classes}`;
            }
          }

          // Add index among siblings
          if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children);
            const index = siblings.indexOf(current);
            selector += `:nth-child(${index + 1})`;
          }

          path.unshift(selector);
          current = current.parentElement;
        }

        return path.join(' > ');
      }

      // Override getBoundingClientRect
      const originalGetBoundingClientRect =
        Element.prototype.getBoundingClientRect;

      Element.prototype.getBoundingClientRect = function () {
        const rect = originalGetBoundingClientRect.call(this);
        return addNoiseToRect(rect, this);
      };

      // Override getClientRects
      const originalGetClientRects = Element.prototype.getClientRects;

      Element.prototype.getClientRects = function () {
        const rects = originalGetClientRects.call(this);
        const noisyRects: DOMRect[] = [];

        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          noisyRects.push(addNoiseToRect(rect, this, i));
        }

        // Return as DOMRectList-like object
        const rectList = Object.assign(noisyRects, {
          item: (index: number) => noisyRects[index] || null,
        });

        return rectList as unknown as DOMRectList;
      };

      // Override Range.prototype.getBoundingClientRect
      const originalRangeGetBoundingClientRect =
        Range.prototype.getBoundingClientRect;

      Range.prototype.getBoundingClientRect = function () {
        const rect = originalRangeGetBoundingClientRect.call(this);
        // Use a dummy element for caching
        const dummyElement = document.createElement('div');
        return addNoiseToRect(rect, dummyElement);
      };

      // Override Range.prototype.getClientRects
      const originalRangeGetClientRects = Range.prototype.getClientRects;

      Range.prototype.getClientRects = function () {
        const rects = originalRangeGetClientRects.call(this);
        const noisyRects: DOMRect[] = [];
        const dummyElement = document.createElement('div');

        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          noisyRects.push(addNoiseToRect(rect, dummyElement, i));
        }

        const rectList = Object.assign(noisyRects, {
          item: (index: number) => noisyRects[index] || null,
        });

        return rectList as unknown as DOMRectList;
      };

      // Make modifications undetectable
      const proxy = new Proxy(Element.prototype.getBoundingClientRect, {
        apply(target, thisArg, args) {
          return Reflect.apply(target, thisArg, args);
        },
      });

      // Fix toString
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function () {
        if (this === Element.prototype.getBoundingClientRect) {
          return 'function getBoundingClientRect() { [native code] }';
        }
        if (this === Element.prototype.getClientRects) {
          return 'function getClientRects() { [native code] }';
        }
        if (this === Range.prototype.getBoundingClientRect) {
          return 'function getBoundingClientRect() { [native code] }';
        }
        if (this === Range.prototype.getClientRects) {
          return 'function getClientRects() { [native code] }';
        }
        return originalToString.call(this);
      };

      // Log for debugging (remove in production)
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `[ClientRects Protection] Applied with noise level: ${config.noiseLevel}, seed: ${domainSeed}`
        );
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ClientRectsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate a new seed
   */
  regenerateSeed(): void {
    this.config.seed = Math.floor(Math.random() * 1000000);
  }
}

/**
 * Factory function for easy instantiation
 */
export function createClientRectsProtection(
  config?: Partial<ClientRectsConfig>
): ClientRectsProtection {
  return new ClientRectsProtection(config);
}

/**
 * Apply ClientRects protection to multiple pages
 */
export async function applyClientRectsProtectionToPages(
  pages: Page[],
  config?: Partial<ClientRectsConfig>
): Promise<void> {
  const protection = new ClientRectsProtection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
