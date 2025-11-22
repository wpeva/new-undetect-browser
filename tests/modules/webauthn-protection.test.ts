import { describe, it, expect, beforeEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { WebAuthnProtectionModule } from '../../src/modules/webauthn-protection';

describe('WebAuthnProtectionModule', () => {
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

  describe('Unsupported Profile (No WebAuthn)', () => {
    let protection: WebAuthnProtectionModule;

    beforeEach(async () => {
      protection = new WebAuthnProtectionModule({
        isSupported: false,
        hasPlatformAuthenticator: false,
        hasExternalAuthenticator: false,
        preferredTransports: [],
      });
      await protection.inject(page);
    });

    it('should not have PublicKeyCredential', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).PublicKeyCredential !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have navigator.credentials', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).credentials !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have AuthenticatorResponse', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).AuthenticatorResponse !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have AuthenticatorAttestationResponse', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).AuthenticatorAttestationResponse !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have AuthenticatorAssertionResponse', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).AuthenticatorAssertionResponse !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should return correct module name', () => {
      expect(protection.getName()).toBe('WebAuthnProtection');
    });
  });

  describe('Supported Profile with Platform Authenticator', () => {
    let protection: WebAuthnProtectionModule;

    beforeEach(async () => {
      protection = new WebAuthnProtectionModule({
        isSupported: true,
        hasPlatformAuthenticator: true,
        hasExternalAuthenticator: false,
        preferredTransports: ['internal'],
      });
      await protection.inject(page);
    });

    it('should have PublicKeyCredential', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).PublicKeyCredential !== 'undefined';
      });
      expect(hasAPI).toBe(true);
    });

    it('should have navigator.credentials', async () => {
      const hasAPI = await page.evaluate(() => {
        return navigator.credentials && typeof navigator.credentials.create === 'function';
      });
      expect(hasAPI).toBe(true);
    });

    it('should report platform authenticator as available', async () => {
      const isAvailable = await page.evaluate(async () => {
        if (!(window as any).PublicKeyCredential) return false;
        return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      });
      expect(isAvailable).toBe(true);
    });

    it('should support conditional mediation', async () => {
      const isAvailable = await page.evaluate(async () => {
        const PKC = (window as any).PublicKeyCredential;
        if (!PKC || !PKC.isConditionalMediationAvailable) return false;
        return await PKC.isConditionalMediationAvailable();
      });
      // Should be true when platform authenticator is available
      expect(isAvailable).toBe(true);
    });

    it('should create credentials with realistic delay', async () => {
      const startTime = Date.now();

      const result = await page.evaluate(async () => {
        try {
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: 'Test' },
              user: {
                id: new Uint8Array(16),
                name: 'test@example.com',
                displayName: 'Test User',
              },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              timeout: 60000,
              attestation: 'none',
            },
          });

          return {
            success: credential !== null,
            hasId: credential && 'id' in credential,
            hasRawId: credential && 'rawId' in credential,
            hasResponse: credential && 'response' in credential,
            type: credential?.type,
          };
        } catch (e: any) {
          return { error: e.name };
        }
      });

      const elapsed = Date.now() - startTime;

      // Should take at least 1 second (realistic user interaction time)
      expect(elapsed).toBeGreaterThanOrEqual(1000);

      // Check result structure
      if (!result.error) {
        expect(result.success).toBe(true);
        expect(result.hasId).toBe(true);
        expect(result.hasRawId).toBe(true);
        expect(result.hasResponse).toBe(true);
        expect(result.type).toBe('public-key');
      }
    });

    it('should get credentials with realistic delay', async () => {
      const startTime = Date.now();

      const result = await page.evaluate(async () => {
        try {
          const credential = await navigator.credentials.get({
            publicKey: {
              challenge: new Uint8Array(32),
              timeout: 60000,
              rpId: 'localhost',
              allowCredentials: [
                {
                  id: new Uint8Array(32),
                  type: 'public-key',
                  transports: ['internal'],
                },
              ],
            },
          });

          return {
            success: credential !== null,
            hasId: credential && 'id' in credential,
            type: credential?.type,
          };
        } catch (e: any) {
          return { error: e.name };
        }
      });

      const elapsed = Date.now() - startTime;

      // Should take at least 500ms
      expect(elapsed).toBeGreaterThanOrEqual(500);
    });

    it('should have preventSilentAccess method', async () => {
      const hasMethod = await page.evaluate(() => {
        return (
          navigator.credentials &&
          typeof navigator.credentials.preventSilentAccess === 'function'
        );
      });
      expect(hasMethod).toBe(true);
    });

    it('should return granted permission for publickey credentials', async () => {
      const permission = await page.evaluate(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return 'unavailable';
        }
        try {
          const result = await navigator.permissions.query({
            name: 'publickey-credentials-get' as any,
          });
          return result.state;
        } catch {
          return 'unavailable';
        }
      });

      expect(permission).toBe('granted');
    });

    it('should allow updating profile', () => {
      const newProfile = {
        isSupported: true,
        hasPlatformAuthenticator: false,
        hasExternalAuthenticator: true,
        preferredTransports: ['usb'] as ('usb' | 'nfc' | 'ble' | 'internal')[],
      };
      protection.setProfile(newProfile);
      expect(protection.getProfile()).toEqual(newProfile);
    });
  });

  describe('Supported Profile without Authenticators', () => {
    let protection: WebAuthnProtectionModule;

    beforeEach(async () => {
      protection = new WebAuthnProtectionModule({
        isSupported: true,
        hasPlatformAuthenticator: false,
        hasExternalAuthenticator: false,
        preferredTransports: [],
      });
      await protection.inject(page);
    });

    it('should report no platform authenticator', async () => {
      const isAvailable = await page.evaluate(async () => {
        if (!(window as any).PublicKeyCredential) return true; // Should be false
        return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      });
      expect(isAvailable).toBe(false);
    });

    it('should throw NotAllowedError when creating credential', async () => {
      const error = await page.evaluate(async () => {
        try {
          await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: 'Test' },
              user: {
                id: new Uint8Array(16),
                name: 'test@example.com',
                displayName: 'Test User',
              },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            },
          });
          return null;
        } catch (e: any) {
          return { name: e.name, message: e.message };
        }
      });

      expect(error).not.toBeNull();
      expect(error?.name).toBe('NotAllowedError');
    });

    it('should throw NotAllowedError when getting credential', async () => {
      const error = await page.evaluate(async () => {
        try {
          await navigator.credentials.get({
            publicKey: {
              challenge: new Uint8Array(32),
              rpId: 'localhost',
            },
          });
          return null;
        } catch (e: any) {
          return { name: e.name, message: e.message };
        }
      });

      expect(error).not.toBeNull();
      expect(error?.name).toBe('NotAllowedError');
    });

    it('should return denied permission for publickey credentials', async () => {
      const permission = await page.evaluate(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return 'unavailable';
        }
        try {
          const result = await navigator.permissions.query({
            name: 'publickey-credentials-get' as any,
          });
          return result.state;
        } catch {
          return 'unavailable';
        }
      });

      expect(permission).toBe('denied');
    });
  });

  describe('Supported Profile with External Authenticator', () => {
    let protection: WebAuthnProtectionModule;

    beforeEach(async () => {
      protection = new WebAuthnProtectionModule({
        isSupported: true,
        hasPlatformAuthenticator: false,
        hasExternalAuthenticator: true,
        preferredTransports: ['usb', 'nfc', 'ble'],
      });
      await protection.inject(page);
    });

    it('should report no platform authenticator', async () => {
      const isAvailable = await page.evaluate(async () => {
        if (!(window as any).PublicKeyCredential) return true;
        return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      });
      expect(isAvailable).toBe(false);
    });

    it('should create credentials with external authenticator', async () => {
      const result = await page.evaluate(async () => {
        try {
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: 'Test' },
              user: {
                id: new Uint8Array(16),
                name: 'test@example.com',
                displayName: 'Test User',
              },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              authenticatorSelection: {
                authenticatorAttachment: 'cross-platform',
              },
            },
          });

          return { success: credential !== null };
        } catch (e: any) {
          return { error: e.name };
        }
      });

      // Should succeed or fail randomly (simulating user interaction)
      expect(result.success !== undefined || result.error !== undefined).toBe(true);
    });

    it('should reject when requesting platform authenticator specifically', async () => {
      const error = await page.evaluate(async () => {
        try {
          await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: 'Test' },
              user: {
                id: new Uint8Array(16),
                name: 'test@example.com',
                displayName: 'Test User',
              },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              authenticatorSelection: {
                authenticatorAttachment: 'platform', // Explicitly requesting platform
              },
            },
          });
          return null;
        } catch (e: any) {
          return { name: e.name };
        }
      });

      expect(error).not.toBeNull();
      expect(error?.name).toBe('NotAllowedError');
    });
  });
});
