import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

export interface DeviceOrientationProfile {
  isMobile: boolean;
  hasGyroscope: boolean;
  hasAccelerometer: boolean;
  hasMagnetometer: boolean;
}

/**
 * Device Orientation Protection Module
 * Protects against detection via Device Orientation and Motion APIs
 * Emulates realistic sensor behavior for mobile devices or hides sensors for desktop
 */
export class DeviceOrientationProtectionModule {
  private profile: DeviceOrientationProfile;

  constructor(profile: DeviceOrientationProfile) {
    this.profile = profile;
  }

  /**
   * Inject device orientation protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting device orientation protection scripts');

    await page.evaluateOnNewDocument((profile: DeviceOrientationProfile) => {
      // ========================================
      // 1. DeviceOrientationEvent Protection
      // ========================================

      if (profile.isMobile && profile.hasGyroscope) {
        // For mobile devices: provide realistic orientation data

        // Store event listeners for manual triggering
        const orientationListeners = new Set<EventListener>();
        const motionListeners = new Set<EventListener>();

        // Override addEventListener to capture orientation listeners
        const originalAddEventListener = window.addEventListener.bind(window);
        window.addEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) {
          if (type === 'deviceorientation' && typeof listener === 'function') {
            orientationListeners.add(listener as EventListener);
          } else if (type === 'devicemotion' && typeof listener === 'function') {
            motionListeners.add(listener as EventListener);
          }
          return originalAddEventListener(type, listener, options);
        };

        // Override removeEventListener
        const originalRemoveEventListener = window.removeEventListener.bind(window);
        window.removeEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | EventListenerOptions
        ) {
          if (type === 'deviceorientation' && typeof listener === 'function') {
            orientationListeners.delete(listener as EventListener);
          } else if (type === 'devicemotion' && typeof listener === 'function') {
            motionListeners.delete(listener as EventListener);
          }
          return originalRemoveEventListener(type, listener, options);
        };

        // Simulate realistic orientation values
        let alpha = 0; // Z-axis rotation (0-360)
        let beta = 0; // X-axis rotation (-180 to 180)
        let gamma = 0; // Y-axis rotation (-90 to 90)

        // Create realistic DeviceOrientationEvent constructor
        const OriginalDeviceOrientationEvent = (window as any).DeviceOrientationEvent;

        if (OriginalDeviceOrientationEvent) {
          // Make DeviceOrientationEvent constructible
          (window as any).DeviceOrientationEvent = class DeviceOrientationEvent extends OriginalDeviceOrientationEvent {
            constructor(type: string, eventInitDict?: DeviceOrientationEventInit) {
              super(type, eventInitDict);
            }
          };

          // Simulate orientation changes periodically (subtle movements)
          setInterval(() => {
            // Add small random changes to simulate natural device movements
            alpha += (Math.random() - 0.5) * 2; // ±1 degree
            beta += (Math.random() - 0.5) * 0.5; // ±0.25 degree
            gamma += (Math.random() - 0.5) * 0.5; // ±0.25 degree

            // Keep values in valid ranges
            alpha = ((alpha % 360) + 360) % 360;
            beta = Math.max(-180, Math.min(180, beta));
            gamma = Math.max(-90, Math.min(90, gamma));

            // Create and dispatch event
            const event = new (window as any).DeviceOrientationEvent('deviceorientation', {
              alpha,
              beta,
              gamma,
              absolute: false,
            });

            orientationListeners.forEach((listener) => {
              try {
                listener(event);
              } catch (e) {
                // Ignore errors in listener
              }
            });
          }, 100); // Update every 100ms for smooth motion
        }

        // ========================================
        // 2. DeviceMotionEvent Protection
        // ========================================

        if (profile.hasAccelerometer) {
          const OriginalDeviceMotionEvent = (window as any).DeviceMotionEvent;

          if (OriginalDeviceMotionEvent) {
            // Make DeviceMotionEvent constructible
            (window as any).DeviceMotionEvent = class DeviceMotionEvent extends OriginalDeviceMotionEvent {
              constructor(type: string, eventInitDict?: DeviceMotionEventInit) {
                super(type, eventInitDict);
              }
            };

            // Simulate motion data periodically
            setInterval(() => {
              // Simulate gravity and acceleration (device at rest with minor vibrations)
              const acceleration = {
                x: (Math.random() - 0.5) * 0.2, // ±0.1 m/s²
                y: (Math.random() - 0.5) * 0.2,
                z: (Math.random() - 0.5) * 0.2,
              };

              const accelerationIncludingGravity = {
                x: acceleration.x + (Math.random() - 0.5) * 0.5,
                y: acceleration.y + (Math.random() - 0.5) * 0.5,
                z: acceleration.z + 9.81 + (Math.random() - 0.5) * 0.5, // Earth's gravity
              };

              const rotationRate = {
                alpha: (Math.random() - 0.5) * 2, // ±1 deg/s
                beta: (Math.random() - 0.5) * 2,
                gamma: (Math.random() - 0.5) * 2,
              };

              const event = new (window as any).DeviceMotionEvent('devicemotion', {
                acceleration,
                accelerationIncludingGravity,
                rotationRate,
                interval: 100,
              });

              motionListeners.forEach((listener) => {
                try {
                  listener(event);
                } catch (e) {
                  // Ignore errors in listener
                }
              });
            }, 100); // Update every 100ms
          }
        }

        // ========================================
        // 3. Permission API for Sensors
        // ========================================

        // Override permissions query for device sensors
        if (navigator.permissions && navigator.permissions.query) {
          const originalQuery = navigator.permissions.query.bind(navigator.permissions);

          navigator.permissions.query = function (permissionDesc: any) {
            if (
              permissionDesc.name === 'accelerometer' ||
              permissionDesc.name === 'gyroscope' ||
              permissionDesc.name === 'magnetometer'
            ) {
              // Return granted for mobile devices
              return Promise.resolve({
                state: 'granted',
                onchange: null,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true,
              } as PermissionStatus);
            }
            return originalQuery(permissionDesc);
          };
        }

      } else {
        // For desktop devices: hide orientation APIs to avoid detection

        // ========================================
        // Desktop: Remove DeviceOrientationEvent
        // ========================================

        if ((window as any).DeviceOrientationEvent) {
          // Make the constructor throw when instantiated
          (window as any).DeviceOrientationEvent = class {
            constructor() {
              throw new TypeError('DeviceOrientationEvent is not supported on this device');
            }
          };

          // Prevent event listeners from being called
          const originalAddEventListener = window.addEventListener.bind(window);
          window.addEventListener = function (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
          ) {
            // Silently ignore device orientation listeners on desktop
            if (type === 'deviceorientation' || type === 'deviceorientationabsolute') {
              return;
            }
            return originalAddEventListener(type, listener, options);
          };
        }

        // ========================================
        // Desktop: Remove DeviceMotionEvent
        // ========================================

        if ((window as any).DeviceMotionEvent) {
          (window as any).DeviceMotionEvent = class {
            constructor() {
              throw new TypeError('DeviceMotionEvent is not supported on this device');
            }
          };

          const originalAddEventListener = window.addEventListener.bind(window);
          window.addEventListener = function (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
          ) {
            // Silently ignore device motion listeners on desktop
            if (type === 'devicemotion') {
              return;
            }
            return originalAddEventListener(type, listener, options);
          };
        }

        // ========================================
        // Desktop: Hide Sensor APIs
        // ========================================

        // Remove Sensor API constructors on desktop
        if ((window as any).Accelerometer) {
          delete (window as any).Accelerometer;
        }
        if ((window as any).Gyroscope) {
          delete (window as any).Gyroscope;
        }
        if ((window as any).Magnetometer) {
          delete (window as any).Magnetometer;
        }
        if ((window as any).LinearAccelerationSensor) {
          delete (window as any).LinearAccelerationSensor;
        }
        if ((window as any).GravitySensor) {
          delete (window as any).GravitySensor;
        }
        if ((window as any).AbsoluteOrientationSensor) {
          delete (window as any).AbsoluteOrientationSensor;
        }
        if ((window as any).RelativeOrientationSensor) {
          delete (window as any).RelativeOrientationSensor;
        }

        // Override permissions query to deny sensor access on desktop
        if (navigator.permissions && navigator.permissions.query) {
          const originalQuery = navigator.permissions.query.bind(navigator.permissions);

          navigator.permissions.query = function (permissionDesc: any) {
            if (
              permissionDesc.name === 'accelerometer' ||
              permissionDesc.name === 'gyroscope' ||
              permissionDesc.name === 'magnetometer'
            ) {
              return Promise.resolve({
                state: 'denied',
                onchange: null,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true,
              } as PermissionStatus);
            }
            return originalQuery(permissionDesc);
          };
        }
      }

      // ========================================
      // 4. Screen Orientation Lock (Mobile Only)
      // ========================================

      if (profile.isMobile && window.screen && (window.screen as any).orientation) {
        const orientation = (window.screen as any).orientation;

        // Make orientation.lock available on mobile
        if (!orientation.lock) {
          orientation.lock = function (lockType: OrientationLockType) {
            return Promise.resolve();
          };
        }

        // Make orientation.unlock available
        if (!orientation.unlock) {
          orientation.unlock = function () {
            return undefined;
          };
        }
      }

      // ========================================
      // 5. Ambient Light Sensor (if available)
      // ========================================

      if (profile.isMobile && (window as any).AmbientLightSensor) {
        // Keep the API but make it return realistic values
        const OriginalAmbientLightSensor = (window as any).AmbientLightSensor;

        (window as any).AmbientLightSensor = class extends OriginalAmbientLightSensor {
          constructor(options?: any) {
            super(options);

            // Simulate realistic ambient light values (in lux)
            Object.defineProperty(this, 'illuminance', {
              get: () => 200 + Math.random() * 100, // Indoor lighting: 200-300 lux
              configurable: true,
            });
          }
        };
      } else if (!profile.isMobile && (window as any).AmbientLightSensor) {
        // Remove on desktop
        delete (window as any).AmbientLightSensor;
      }

      // ========================================
      // 6. Proximity Sensor (Mobile Only)
      // ========================================

      if (!profile.isMobile && (window as any).ProximitySensor) {
        delete (window as any).ProximitySensor;
      }

      // ========================================
      // 7. ondeviceorientation Property
      // ========================================

      // Ensure window.ondeviceorientation exists on mobile
      if (profile.isMobile && !('ondeviceorientation' in window)) {
        (window as any).ondeviceorientation = null;
      }

      // Ensure window.ondevicemotion exists on mobile
      if (profile.isMobile && profile.hasAccelerometer && !('ondevicemotion' in window)) {
        (window as any).ondevicemotion = null;
      }
    }, this.profile);

    logger.debug('Device orientation protection scripts injected successfully');
  }

  /**
   * Update device profile
   */
  setProfile(profile: DeviceOrientationProfile): void {
    this.profile = profile;
  }

  /**
   * Get current profile
   */
  getProfile(): DeviceOrientationProfile {
    return this.profile;
  }

  /**
   * Get module name
   */
  getName(): string {
    return 'DeviceOrientationProtection';
  }
}
