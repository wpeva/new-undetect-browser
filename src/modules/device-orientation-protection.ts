/**
 * Device Orientation & Motion Protection Module
 *
 * Protects against fingerprinting through Device Orientation and Motion events.
 * Desktop devices typically don't support these APIs, while mobile devices do.
 *
 * This ensures proper device type consistency.
 *
 * CRITICAL for:
 * - Device type consistency (desktop vs mobile)
 * - creepjs.com detection
 * - Advanced device fingerprinting
 */

import type { Page } from 'puppeteer';

export interface DeviceOrientationConfig {
  enabled: boolean;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  // Mobile-specific settings
  enableMotion?: boolean;
  enableOrientation?: boolean;
  customOrientationData?: DeviceOrientationData;
  customMotionData?: DeviceMotionData;
}

export interface DeviceOrientationData {
  alpha: number | null; // 0-360 degrees (rotation around Z axis)
  beta: number | null; // -180 to 180 degrees (rotation around X axis)
  gamma: number | null; // -90 to 90 degrees (rotation around Y axis)
  absolute: boolean;
}

export interface DeviceMotionData {
  acceleration: {
    x: number | null;
    y: number | null;
    z: number | null;
  };
  accelerationIncludingGravity: {
    x: number | null;
    y: number | null;
    z: number | null;
  };
  rotationRate: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
  };
  interval: number;
}

/**
 * Realistic device orientation/motion data for mobile devices
 */
const DEFAULT_MOBILE_ORIENTATION: DeviceOrientationData = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  absolute: true,
};

const DEFAULT_MOBILE_MOTION: DeviceMotionData = {
  acceleration: { x: 0, y: 0, z: 0 },
  accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 }, // Gravity
  rotationRate: { alpha: 0, beta: 0, gamma: 0 },
  interval: 16, // ~60Hz
};

export class DeviceOrientationProtection {
  private config: DeviceOrientationConfig;

  constructor(config: Partial<DeviceOrientationConfig> = {}) {
    this.config = {
      enabled: true,
      deviceType: 'desktop',
      enableMotion: false,
      enableOrientation: false,
      ...config,
    };

    // Auto-configure based on device type
    if (this.config.deviceType === 'mobile' || this.config.deviceType === 'tablet') {
      this.config.enableMotion = config.enableMotion ?? true;
      this.config.enableOrientation = config.enableOrientation ?? true;
    }
  }

  /**
   * Apply Device Orientation protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await page.evaluateOnNewDocument(
      this.getInjectionScript(),
      this.config,
      DEFAULT_MOBILE_ORIENTATION,
      DEFAULT_MOBILE_MOTION
    );
  }

  /**
   * Get the injection script
   */
  private getInjectionScript() {
    return (
      config: DeviceOrientationConfig,
      defaultOrientation: DeviceOrientationData,
      defaultMotion: DeviceMotionData
    ) => {
      if (config.deviceType === 'desktop') {
        // Desktop devices: Remove/disable these APIs

        // Remove DeviceOrientationEvent
        if (typeof DeviceOrientationEvent !== 'undefined') {
          (window as any).DeviceOrientationEvent = undefined;
          delete (window as any).DeviceOrientationEvent;
        }

        // Remove DeviceMotionEvent
        if (typeof DeviceMotionEvent !== 'undefined') {
          (window as any).DeviceMotionEvent = undefined;
          delete (window as any).DeviceMotionEvent;
        }

        // Remove ondeviceorientation handler
        Object.defineProperty(window, 'ondeviceorientation', {
          get: () => null,
          set: () => {},
          configurable: true,
          enumerable: true,
        });

        // Remove ondevicemotion handler
        Object.defineProperty(window, 'ondevicemotion', {
          get: () => null,
          set: () => {},
          configurable: true,
          enumerable: true,
        });

        // Block addEventListener for these events
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (
          type: string,
          listener: any,
          options?: any
        ) {
          if (
            type === 'deviceorientation' ||
            type === 'deviceorientationabsolute' ||
            type === 'devicemotion'
          ) {
            // Silently ignore these event listeners on desktop
            return;
          }
          return originalAddEventListener.call(this, type, listener, options);
        };

      } else {
        // Mobile/Tablet devices: Provide realistic data

        const orientationData = config.customOrientationData || defaultOrientation;
        const motionData = config.customMotionData || defaultMotion;

        // Store listeners
        const orientationListeners: EventListener[] = [];
        const motionListeners: EventListener[] = [];

        // Override addEventListener to track device orientation/motion listeners
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (
          type: string,
          listener: any,
          options?: any
        ) {
          if (type === 'deviceorientation' && config.enableOrientation) {
            orientationListeners.push(listener);

            // Trigger with realistic data after a delay
            setTimeout(() => {
              const event = new DeviceOrientationEvent('deviceorientation', {
                alpha: orientationData.alpha,
                beta: orientationData.beta,
                gamma: orientationData.gamma,
                absolute: orientationData.absolute,
              });
              listener.call(window, event);
            }, 100);
          } else if (type === 'devicemotion' && config.enableMotion) {
            motionListeners.push(listener);

            // Trigger with realistic data after a delay
            setTimeout(() => {
              const event = new DeviceMotionEvent('devicemotion', {
                acceleration: motionData.acceleration,
                accelerationIncludingGravity: motionData.accelerationIncludingGravity,
                rotationRate: motionData.rotationRate,
                interval: motionData.interval,
              });
              listener.call(window, event);
            }, 100);
          }

          return originalAddEventListener.call(this, type, listener, options);
        };

        // Simulate periodic updates for mobile devices
        if (config.enableOrientation) {
          setInterval(() => {
            // Add small random variations to simulate real device movement
            const event = new DeviceOrientationEvent('deviceorientation', {
              alpha: orientationData.alpha! + (Math.random() - 0.5) * 0.5,
              beta: orientationData.beta! + (Math.random() - 0.5) * 0.5,
              gamma: orientationData.gamma! + (Math.random() - 0.5) * 0.5,
              absolute: orientationData.absolute,
            });

            orientationListeners.forEach((listener) => {
              listener.call(window, event);
            });
          }, 100); // 10Hz update rate
        }

        if (config.enableMotion) {
          setInterval(() => {
            // Add small random variations to simulate real device movement
            const event = new DeviceMotionEvent('devicemotion', {
              acceleration: {
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1,
              },
              accelerationIncludingGravity: {
                x: (Math.random() - 0.5) * 0.5,
                y: 9.8 + (Math.random() - 0.5) * 0.2,
                z: (Math.random() - 0.5) * 0.5,
              },
              rotationRate: {
                alpha: (Math.random() - 0.5) * 0.5,
                beta: (Math.random() - 0.5) * 0.5,
                gamma: (Math.random() - 0.5) * 0.5,
              },
              interval: motionData.interval,
            });

            motionListeners.forEach((listener) => {
              listener.call(window, event);
            });
          }, 16); // ~60Hz update rate
        }
      }

      // Fix toString for addEventListener
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function () {
        if (this === EventTarget.prototype.addEventListener) {
          return 'function addEventListener() { [native code] }';
        }
        return originalToString.call(this);
      };

      // Log for debugging
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `[DeviceOrientation Protection] Applied for ${config.deviceType} device`
        );
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DeviceOrientationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory function
 */
export function createDeviceOrientationProtection(
  config?: Partial<DeviceOrientationConfig>
): DeviceOrientationProtection {
  return new DeviceOrientationProtection(config);
}

/**
 * Apply to multiple pages
 */
export async function applyDeviceOrientationProtectionToPages(
  pages: Page[],
  config?: Partial<DeviceOrientationConfig>
): Promise<void> {
  const protection = new DeviceOrientationProtection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
