/**
 * WebAuthn & Credential Management API Protection Module
 *
 * Protects against fingerprinting through WebAuthn (Web Authentication) and
 * Credential Management APIs. These APIs can reveal platform capabilities
 * and are used for advanced fingerprinting.
 *
 * Provides realistic implementations based on platform.
 *
 * CRITICAL for:
 * - Platform consistency
 * - creepjs.com detection
 * - Advanced API fingerprinting
 */

import type { Page } from 'puppeteer';

export interface WebAuthnConfig {
  enabled: boolean;
  platform: 'Win32' | 'MacIntel' | 'Linux x86_64' | 'iPhone' | 'iPad' | 'Android';
  // WebAuthn availability
  publicKeyCredentialAvailable: boolean;
  // Credential Management API availability
  credentialManagementAvailable: boolean;
  // Authenticator types
  supportPlatformAuthenticator: boolean; // Windows Hello, Touch ID, etc.
  supportCrossPlatformAuthenticator: boolean; // USB security keys
}

/**
 * Platform-specific WebAuthn support
 */
const PLATFORM_SUPPORT: Record<string, Partial<WebAuthnConfig>> = {
  Win32: {
    publicKeyCredentialAvailable: true,
    credentialManagementAvailable: true,
    supportPlatformAuthenticator: true, // Windows Hello
    supportCrossPlatformAuthenticator: true,
  },
  MacIntel: {
    publicKeyCredentialAvailable: true,
    credentialManagementAvailable: true,
    supportPlatformAuthenticator: true, // Touch ID, Face ID
    supportCrossPlatformAuthenticator: true,
  },
  'Linux x86_64': {
    publicKeyCredentialAvailable: true,
    credentialManagementAvailable: true,
    supportPlatformAuthenticator: false, // Usually no platform authenticator on Linux
    supportCrossPlatformAuthenticator: true,
  },
  iPhone: {
    publicKeyCredentialAvailable: true,
    credentialManagementAvailable: true,
    supportPlatformAuthenticator: true, // Face ID, Touch ID
    supportCrossPlatformAuthenticator: false, // No USB on iPhone
  },
  iPad: {
    publicKeyCredentialAvailable: true,
    credentialManagementAvailable: true,
    supportPlatformAuthenticator: true, // Face ID, Touch ID
    supportCrossPlatformAuthenticator: false,
  },
  Android: {
    publicKeyCredentialAvailable: true,
    credentialManagementAvailable: true,
    supportPlatformAuthenticator: true, // Fingerprint, Face unlock
    supportCrossPlatformAuthenticator: false, // No USB typically
  },
};

export class WebAuthnProtection {
  private config: WebAuthnConfig;

  constructor(config: Partial<WebAuthnConfig> = {}) {
    const platform = config.platform || 'Win32';
    const platformDefaults = PLATFORM_SUPPORT[platform] || PLATFORM_SUPPORT.Win32;

    this.config = {
      enabled: true,
      platform,
      publicKeyCredentialAvailable: true,
      credentialManagementAvailable: true,
      supportPlatformAuthenticator: false,
      supportCrossPlatformAuthenticator: false,
      ...platformDefaults,
      ...config,
    };
  }

  /**
   * Apply WebAuthn protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await page.evaluateOnNewDocument(this.getInjectionScript(), this.config);
  }

  /**
   * Get the injection script
   */
  private getInjectionScript() {
    return (config: WebAuthnConfig) => {
      // ========== PublicKeyCredential API ==========
      if (config.publicKeyCredentialAvailable) {
        // Ensure PublicKeyCredential exists
        if (typeof PublicKeyCredential === 'undefined') {
          // Create a mock PublicKeyCredential class
          (window as any).PublicKeyCredential = class PublicKeyCredential {
            readonly id: string = '';
            readonly type: string = 'public-key';
            readonly rawId: ArrayBuffer = new ArrayBuffer(0);

            static isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean> {
              return Promise.resolve(config.supportPlatformAuthenticator);
            }

            static isConditionalMediationAvailable(): Promise<boolean> {
              return Promise.resolve(false); // Usually false
            }
          };
        } else {
          // Override the static methods
          const originalIsUserVerifying =
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
          const originalIsConditional =
            PublicKeyCredential.isConditionalMediationAvailable;

          PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
            function (): Promise<boolean> {
              return Promise.resolve(config.supportPlatformAuthenticator);
            };

          if (originalIsConditional) {
            PublicKeyCredential.isConditionalMediationAvailable =
              function (): Promise<boolean> {
                return Promise.resolve(false);
              };
          }

          // Fix toString
          const originalToString = Function.prototype.toString;
          Function.prototype.toString = function () {
            if (
              this ===
              PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
            ) {
              return 'function isUserVerifyingPlatformAuthenticatorAvailable() { [native code] }';
            }
            if (
              originalIsConditional &&
              this === PublicKeyCredential.isConditionalMediationAvailable
            ) {
              return 'function isConditionalMediationAvailable() { [native code] }';
            }
            return originalToString.call(this);
          };
        }
      } else {
        // Remove PublicKeyCredential if not available
        if (typeof PublicKeyCredential !== 'undefined') {
          (window as any).PublicKeyCredential = undefined;
          delete (window as any).PublicKeyCredential;
        }
      }

      // ========== Credential Management API ==========
      if (config.credentialManagementAvailable) {
        // Ensure navigator.credentials exists
        if (!navigator.credentials) {
          (navigator as any).credentials = {
            create: async (options: any) => {
              // Mock implementation
              throw new DOMException(
                'The operation is not supported.',
                'NotSupportedError'
              );
            },
            get: async (options: any) => {
              // Mock implementation
              throw new DOMException(
                'The operation is not supported.',
                'NotSupportedError'
              );
            },
            store: async (credential: any) => {
              // Mock implementation
              return undefined;
            },
            preventSilentAccess: async () => {
              // Mock implementation
              return undefined;
            },
          };
        } else {
          // Wrap existing methods to ensure realistic behavior
          const originalCreate = navigator.credentials.create.bind(
            navigator.credentials
          );
          const originalGet = navigator.credentials.get.bind(navigator.credentials);

          navigator.credentials.create = async function (options: any) {
            // Add realistic delays
            await new Promise((resolve) =>
              setTimeout(resolve, 100 + Math.random() * 200)
            );

            // Check for WebAuthn support
            if (options?.publicKey) {
              if (!config.supportPlatformAuthenticator) {
                throw new DOMException(
                  'The platform authenticator is not available.',
                  'NotAllowedError'
                );
              }
            }

            return originalCreate(options);
          };

          navigator.credentials.get = async function (options: any) {
            // Add realistic delays
            await new Promise((resolve) =>
              setTimeout(resolve, 100 + Math.random() * 200)
            );

            // Check for WebAuthn support
            if (options?.publicKey) {
              if (!config.supportPlatformAuthenticator) {
                throw new DOMException(
                  'The platform authenticator is not available.',
                  'NotAllowedError'
                );
              }
            }

            return originalGet(options);
          };

          // Fix toString
          const originalToString = Function.prototype.toString;
          Function.prototype.toString = function () {
            if (this === navigator.credentials.create) {
              return 'function create() { [native code] }';
            }
            if (this === navigator.credentials.get) {
              return 'function get() { [native code] }';
            }
            return originalToString.call(this);
          };
        }
      } else {
        // Remove credentials API if not available
        if (navigator.credentials) {
          (navigator as any).credentials = undefined;
          delete (navigator as any).credentials;
        }
      }

      // ========== AuthenticatorAssertionResponse & AuthenticatorAttestationResponse ==========
      // These should exist if PublicKeyCredential exists
      if (config.publicKeyCredentialAvailable) {
        if (typeof AuthenticatorAssertionResponse === 'undefined') {
          (window as any).AuthenticatorAssertionResponse = class {
            readonly clientDataJSON: ArrayBuffer = new ArrayBuffer(0);
            readonly authenticatorData: ArrayBuffer = new ArrayBuffer(0);
            readonly signature: ArrayBuffer = new ArrayBuffer(0);
            readonly userHandle: ArrayBuffer | null = null;
          };
        }

        if (typeof AuthenticatorAttestationResponse === 'undefined') {
          (window as any).AuthenticatorAttestationResponse = class {
            readonly clientDataJSON: ArrayBuffer = new ArrayBuffer(0);
            readonly attestationObject: ArrayBuffer = new ArrayBuffer(0);
          };
        }
      } else {
        if (typeof AuthenticatorAssertionResponse !== 'undefined') {
          (window as any).AuthenticatorAssertionResponse = undefined;
          delete (window as any).AuthenticatorAssertionResponse;
        }
        if (typeof AuthenticatorAttestationResponse !== 'undefined') {
          (window as any).AuthenticatorAttestationResponse = undefined;
          delete (window as any).AuthenticatorAttestationResponse;
        }
      }

      // ========== PasswordCredential & FederatedCredential ==========
      // These are part of Credential Management API
      if (config.credentialManagementAvailable) {
        if (typeof PasswordCredential === 'undefined') {
          (window as any).PasswordCredential = class PasswordCredential {
            readonly id: string = '';
            readonly type: string = 'password';
            readonly password: string = '';
            readonly name: string = '';
            readonly iconURL: string = '';

            constructor(data: any) {
              this.id = data.id || '';
              this.password = data.password || '';
              this.name = data.name || '';
              this.iconURL = data.iconURL || '';
            }
          };
        }

        if (typeof FederatedCredential === 'undefined') {
          (window as any).FederatedCredential = class FederatedCredential {
            readonly id: string = '';
            readonly type: string = 'federated';
            readonly provider: string = '';
            readonly protocol: string = '';
            readonly name: string = '';
            readonly iconURL: string = '';

            constructor(data: any) {
              this.id = data.id || '';
              this.provider = data.provider || '';
              this.protocol = data.protocol || '';
              this.name = data.name || '';
              this.iconURL = data.iconURL || '';
            }
          };
        }
      } else {
        if (typeof PasswordCredential !== 'undefined') {
          (window as any).PasswordCredential = undefined;
          delete (window as any).PasswordCredential;
        }
        if (typeof FederatedCredential !== 'undefined') {
          (window as any).FederatedCredential = undefined;
          delete (window as any).FederatedCredential;
        }
      }

      // Log for debugging
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `[WebAuthn Protection] Applied for ${config.platform} (PublicKey: ${config.publicKeyCredentialAvailable}, Platform Auth: ${config.supportPlatformAuthenticator})`
        );
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WebAuthnConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory function
 */
export function createWebAuthnProtection(
  config?: Partial<WebAuthnConfig>
): WebAuthnProtection {
  return new WebAuthnProtection(config);
}

/**
 * Apply to multiple pages
 */
export async function applyWebAuthnProtectionToPages(
  pages: Page[],
  config?: Partial<WebAuthnConfig>
): Promise<void> {
  const protection = new WebAuthnProtection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
