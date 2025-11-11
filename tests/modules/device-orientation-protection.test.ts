import { describe, it, expect, beforeEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { DeviceOrientationProtectionModule } from '../../src/modules/device-orientation-protection';

describe('DeviceOrientationProtectionModule', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('Mobile Profile with Sensors', () => {
    let protection: DeviceOrientationProtectionModule;

    beforeEach(async () => {
      protection = new DeviceOrientationProtectionModule({
        isMobile: true,
        hasGyroscope: true,
        hasAccelerometer: true,
        hasMagnetometer: true,
      });
      await protection.inject(page);
    });

    it('should have DeviceOrientationEvent constructor', async () => {
      const hasConstructor = await page.evaluate(() => {
        return typeof (window as any).DeviceOrientationEvent === 'function';
      });
      expect(hasConstructor).toBe(true);
    });

    it('should have DeviceMotionEvent constructor', async () => {
      const hasConstructor = await page.evaluate(() => {
        return typeof (window as any).DeviceMotionEvent === 'function';
      });
      expect(hasConstructor).toBe(true);
    });

    it('should have ondeviceorientation property', async () => {
      const hasProperty = await page.evaluate(() => {
        return 'ondeviceorientation' in window;
      });
      expect(hasProperty).toBe(true);
    });

    it('should have ondevicemotion property', async () => {
      const hasProperty = await page.evaluate(() => {
        return 'ondevicemotion' in window;
      });
      expect(hasProperty).toBe(true);
    });

    it('should allow adding deviceorientation event listeners', async () => {
      const canAddListener = await page.evaluate(() => {
        let eventFired = false;
        const listener = () => {
          eventFired = true;
        };
        window.addEventListener('deviceorientation', listener);
        return true; // If no error thrown, we can add listeners
      });
      expect(canAddListener).toBe(true);
    });

    it('should fire deviceorientation events with valid data', async () => {
      const eventData = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          const listener = (event: any) => {
            resolve({
              alpha: event.alpha,
              beta: event.beta,
              gamma: event.gamma,
              absolute: event.absolute,
            });
            window.removeEventListener('deviceorientation', listener);
          };
          window.addEventListener('deviceorientation', listener);
        });
      });

      expect(eventData).toBeDefined();
      expect(typeof eventData.alpha).toBe('number');
      expect(typeof eventData.beta).toBe('number');
      expect(typeof eventData.gamma).toBe('number');
      expect(eventData.alpha).toBeGreaterThanOrEqual(0);
      expect(eventData.alpha).toBeLessThan(360);
      expect(eventData.beta).toBeGreaterThanOrEqual(-180);
      expect(eventData.beta).toBeLessThanOrEqual(180);
      expect(eventData.gamma).toBeGreaterThanOrEqual(-90);
      expect(eventData.gamma).toBeLessThanOrEqual(90);
    });

    it('should fire devicemotion events with acceleration data', async () => {
      const eventData = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          const listener = (event: any) => {
            resolve({
              hasAcceleration: event.acceleration !== null,
              hasAccelerationIncludingGravity: event.accelerationIncludingGravity !== null,
              hasRotationRate: event.rotationRate !== null,
              interval: event.interval,
            });
            window.removeEventListener('devicemotion', listener);
          };
          window.addEventListener('devicemotion', listener);
        });
      });

      expect(eventData.hasAcceleration).toBe(true);
      expect(eventData.hasAccelerationIncludingGravity).toBe(true);
      expect(eventData.hasRotationRate).toBe(true);
      expect(eventData.interval).toBe(100);
    });

    it('should have realistic acceleration values', async () => {
      const acceleration = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          const listener = (event: any) => {
            resolve({
              x: event.acceleration.x,
              y: event.acceleration.y,
              z: event.acceleration.z,
            });
            window.removeEventListener('devicemotion', listener);
          };
          window.addEventListener('devicemotion', listener);
        });
      });

      // Values should be small (device at rest with minor vibrations)
      expect(Math.abs(acceleration.x)).toBeLessThan(1);
      expect(Math.abs(acceleration.y)).toBeLessThan(1);
      expect(Math.abs(acceleration.z)).toBeLessThan(1);
    });

    it('should have gravity in accelerationIncludingGravity', async () => {
      const acceleration = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          const listener = (event: any) => {
            resolve({
              z: event.accelerationIncludingGravity.z,
            });
            window.removeEventListener('devicemotion', listener);
          };
          window.addEventListener('devicemotion', listener);
        });
      });

      // Z-axis should include Earth's gravity (~9.81 m/s²)
      expect(acceleration.z).toBeGreaterThan(8);
      expect(acceleration.z).toBeLessThan(11);
    });

    it('should grant sensor permissions', async () => {
      const permissions = await page.evaluate(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return { accelerometer: 'unavailable', gyroscope: 'unavailable' };
        }

        const accelerometer = await navigator.permissions.query({ name: 'accelerometer' } as any);
        const gyroscope = await navigator.permissions.query({ name: 'gyroscope' } as any);

        return {
          accelerometer: accelerometer.state,
          gyroscope: gyroscope.state,
        };
      });

      expect(permissions.accelerometer).toBe('granted');
      expect(permissions.gyroscope).toBe('granted');
    });

    it('should return correct module name', () => {
      expect(protection.getName()).toBe('DeviceOrientationProtection');
    });

    it('should allow updating profile', () => {
      const newProfile = {
        isMobile: false,
        hasGyroscope: false,
        hasAccelerometer: false,
        hasMagnetometer: false,
      };
      protection.setProfile(newProfile);
      expect(protection.getProfile()).toEqual(newProfile);
    });
  });

  describe('Desktop Profile without Sensors', () => {
    let protection: DeviceOrientationProtectionModule;

    beforeEach(async () => {
      protection = new DeviceOrientationProtectionModule({
        isMobile: false,
        hasGyroscope: false,
        hasAccelerometer: false,
        hasMagnetometer: false,
      });
      await protection.inject(page);
    });

    it('should have DeviceOrientationEvent but throw on instantiation', async () => {
      const throwsError = await page.evaluate(() => {
        try {
          new (window as any).DeviceOrientationEvent('deviceorientation');
          return false;
        } catch (e) {
          return e instanceof TypeError;
        }
      });
      expect(throwsError).toBe(true);
    });

    it('should have DeviceMotionEvent but throw on instantiation', async () => {
      const throwsError = await page.evaluate(() => {
        try {
          new (window as any).DeviceMotionEvent('devicemotion');
          return false;
        } catch (e) {
          return e instanceof TypeError;
        }
      });
      expect(throwsError).toBe(true);
    });

    it('should not fire deviceorientation events', async () => {
      const eventFired = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          let fired = false;
          const listener = () => {
            fired = true;
          };
          window.addEventListener('deviceorientation', listener);

          // Wait 500ms to see if event fires
          setTimeout(() => {
            window.removeEventListener('deviceorientation', listener);
            resolve(fired);
          }, 500);
        });
      });

      expect(eventFired).toBe(false);
    });

    it('should not fire devicemotion events', async () => {
      const eventFired = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          let fired = false;
          const listener = () => {
            fired = true;
          };
          window.addEventListener('devicemotion', listener);

          setTimeout(() => {
            window.removeEventListener('devicemotion', listener);
            resolve(fired);
          }, 500);
        });
      });

      expect(eventFired).toBe(false);
    });

    it('should not have Accelerometer constructor', async () => {
      const hasAccelerometer = await page.evaluate(() => {
        return typeof (window as any).Accelerometer !== 'undefined';
      });
      expect(hasAccelerometer).toBe(false);
    });

    it('should not have Gyroscope constructor', async () => {
      const hasGyroscope = await page.evaluate(() => {
        return typeof (window as any).Gyroscope !== 'undefined';
      });
      expect(hasGyroscope).toBe(false);
    });

    it('should not have Magnetometer constructor', async () => {
      const hasMagnetometer = await page.evaluate(() => {
        return typeof (window as any).Magnetometer !== 'undefined';
      });
      expect(hasMagnetometer).toBe(false);
    });

    it('should not have LinearAccelerationSensor', async () => {
      const hasSensor = await page.evaluate(() => {
        return typeof (window as any).LinearAccelerationSensor !== 'undefined';
      });
      expect(hasSensor).toBe(false);
    });

    it('should not have GravitySensor', async () => {
      const hasSensor = await page.evaluate(() => {
        return typeof (window as any).GravitySensor !== 'undefined';
      });
      expect(hasSensor).toBe(false);
    });

    it('should not have orientation sensors', async () => {
      const hasSensors = await page.evaluate(() => {
        return {
          absolute: typeof (window as any).AbsoluteOrientationSensor !== 'undefined',
          relative: typeof (window as any).RelativeOrientationSensor !== 'undefined',
        };
      });
      expect(hasSensors.absolute).toBe(false);
      expect(hasSensors.relative).toBe(false);
    });

    it('should deny sensor permissions', async () => {
      const permissions = await page.evaluate(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return { accelerometer: 'unavailable', gyroscope: 'unavailable' };
        }

        const accelerometer = await navigator.permissions.query({ name: 'accelerometer' } as any);
        const gyroscope = await navigator.permissions.query({ name: 'gyroscope' } as any);

        return {
          accelerometer: accelerometer.state,
          gyroscope: gyroscope.state,
        };
      });

      expect(permissions.accelerometer).toBe('denied');
      expect(permissions.gyroscope).toBe('denied');
    });

    it('should not have AmbientLightSensor on desktop', async () => {
      const hasSensor = await page.evaluate(() => {
        return typeof (window as any).AmbientLightSensor !== 'undefined';
      });
      expect(hasSensor).toBe(false);
    });

    it('should not have ProximitySensor on desktop', async () => {
      const hasSensor = await page.evaluate(() => {
        return typeof (window as any).ProximitySensor !== 'undefined';
      });
      expect(hasSensor).toBe(false);
    });
  });
});
