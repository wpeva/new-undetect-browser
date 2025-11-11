import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

export interface WebAuthnProfile {
  isSupported: boolean;
  hasPlatformAuthenticator: boolean; // Touch ID, Face ID, Windows Hello
  hasExternalAuthenticator: boolean; // USB security keys
  preferredTransports: ('usb' | 'nfc' | 'ble' | 'internal')[];
}

/**
 * WebAuthn Protection Module
 * Protects against detection via Web Authentication API
 * Provides realistic WebAuthn behavior or hides it entirely
 */
export class WebAuthnProtectionModule {
  private profile: WebAuthnProfile;

  constructor(profile: WebAuthnProfile) {
    this.profile = profile;
  }

  /**
   * Inject WebAuthn protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting WebAuthn protection scripts');

    await page.evaluateOnNewDocument((profile: WebAuthnProfile) => {
      if (!profile.isSupported) {
        // ========================================
        // Complete WebAuthn Removal (Old Browsers/Unsupported)
        // ========================================

        // Remove PublicKeyCredential
        if ((window as any).PublicKeyCredential) {
          delete (window as any).PublicKeyCredential;
        }

        // Remove Credential Management API
        if (navigator.credentials) {
          delete (navigator as any).credentials;
        }

        // Remove AuthenticatorResponse
        if ((window as any).AuthenticatorResponse) {
          delete (window as any).AuthenticatorResponse;
        }
        if ((window as any).AuthenticatorAttestationResponse) {
          delete (window as any).AuthenticatorAttestationResponse;
        }
        if ((window as any).AuthenticatorAssertionResponse) {
          delete (window as any).AuthenticatorAssertionResponse;
        }

        logger.debug('WebAuthn API completely removed for unsupported profile');
      } else {
        // ========================================
        // WebAuthn API Spoofing (Modern Browsers)
        // ========================================

        // 1. PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
        if ((window as any).PublicKeyCredential) {
          const OriginalPublicKeyCredential = (window as any).PublicKeyCredential;

          // Override static method
          OriginalPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
            async function () {
              // Return based on profile
              return Promise.resolve(profile.hasPlatformAuthenticator);
            };

          // Override isConditionalMediationAvailable (Chrome 108+)
          if (OriginalPublicKeyCredential.isConditionalMediationAvailable) {
            OriginalPublicKeyCredential.isConditionalMediationAvailable = async function () {
              // Conditional UI is only available with platform authenticator
              return Promise.resolve(profile.hasPlatformAuthenticator);
            };
          }

          // ========================================
          // 2. navigator.credentials Protection
          // ========================================

          if (navigator.credentials) {
            const originalCreate = navigator.credentials.create.bind(navigator.credentials);
            const originalGet = navigator.credentials.get.bind(navigator.credentials);

            // Override credentials.create() for WebAuthn registration
            navigator.credentials.create = async function (options?: CredentialCreationOptions) {
              if (options && options.publicKey) {
                // Simulate realistic WebAuthn registration flow

                // Check if authenticators are available
                if (!profile.hasPlatformAuthenticator && !profile.hasExternalAuthenticator) {
                  throw new DOMException(
                    'No available authenticator',
                    'NotAllowedError'
                  );
                }

                // Validate authenticator selection
                const authenticatorSelection = options.publicKey.authenticatorSelection;
                if (
                  authenticatorSelection &&
                  authenticatorSelection.authenticatorAttachment === 'platform' &&
                  !profile.hasPlatformAuthenticator
                ) {
                  throw new DOMException(
                    'Requested authenticator is not available',
                    'NotAllowedError'
                  );
                }

                // Add realistic delay (user interaction time)
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 + Math.random() * 2000)
                );

                // Simulate user cancellation sometimes (10% chance)
                if (Math.random() < 0.1) {
                  throw new DOMException(
                    'The operation either timed out or was not allowed',
                    'NotAllowedError'
                  );
                }

                // Create mock credential response
                const credentialId = new Uint8Array(32);
                crypto.getRandomValues(credentialId);

                const attestationObject = new Uint8Array(256);
                crypto.getRandomValues(attestationObject);

                const clientDataJSON = new TextEncoder().encode(
                  JSON.stringify({
                    type: 'webauthn.create',
                    challenge: btoa(String.fromCharCode(...new Uint8Array(options.publicKey.challenge as ArrayBuffer))),
                    origin: window.location.origin,
                    crossOrigin: false,
                  })
                );

                // Create realistic PublicKeyCredential
                const credential = {
                  id: btoa(String.fromCharCode(...credentialId)),
                  rawId: credentialId.buffer,
                  type: 'public-key',
                  response: {
                    clientDataJSON: clientDataJSON.buffer,
                    attestationObject: attestationObject.buffer,
                    getTransports: function () {
                      return profile.preferredTransports;
                    },
                    getAuthenticatorData: function () {
                      return new Uint8Array(37).buffer; // Mock authenticator data
                    },
                    getPublicKey: function () {
                      return new Uint8Array(65).buffer; // Mock public key
                    },
                    getPublicKeyAlgorithm: function () {
                      return -7; // ES256
                    },
                  },
                  getClientExtensionResults: function () {
                    return {};
                  },
                };

                return credential as any;
              }

              // Fallback to original for other credential types
              return originalCreate(options);
            };

            // Override credentials.get() for WebAuthn authentication
            navigator.credentials.get = async function (options?: CredentialRequestOptions) {
              if (options && options.publicKey) {
                // Simulate realistic WebAuthn authentication flow

                // Check if authenticators are available
                if (!profile.hasPlatformAuthenticator && !profile.hasExternalAuthenticator) {
                  throw new DOMException(
                    'No available authenticator',
                    'NotAllowedError'
                  );
                }

                // Add realistic delay
                await new Promise((resolve) =>
                  setTimeout(resolve, 500 + Math.random() * 1500)
                );

                // Simulate user cancellation sometimes (5% chance)
                if (Math.random() < 0.05) {
                  throw new DOMException(
                    'The operation either timed out or was not allowed',
                    'NotAllowedError'
                  );
                }

                // Create mock assertion response
                const credentialId = new Uint8Array(32);
                crypto.getRandomValues(credentialId);

                const authenticatorData = new Uint8Array(37);
                crypto.getRandomValues(authenticatorData);

                const signature = new Uint8Array(64);
                crypto.getRandomValues(signature);

                const clientDataJSON = new TextEncoder().encode(
                  JSON.stringify({
                    type: 'webauthn.get',
                    challenge: btoa(String.fromCharCode(...new Uint8Array(options.publicKey.challenge as ArrayBuffer))),
                    origin: window.location.origin,
                    crossOrigin: false,
                  })
                );

                const credential = {
                  id: btoa(String.fromCharCode(...credentialId)),
                  rawId: credentialId.buffer,
                  type: 'public-key',
                  response: {
                    clientDataJSON: clientDataJSON.buffer,
                    authenticatorData: authenticatorData.buffer,
                    signature: signature.buffer,
                    userHandle: null,
                  },
                  getClientExtensionResults: function () {
                    return {};
                  },
                };

                return credential as any;
              }

              // Fallback to original for other credential types
              return originalGet(options);
            };
          }

          // ========================================
          // 3. Credential Management API Consistency
          // ========================================

          if (navigator.credentials) {
            // Ensure preventSilentAccess exists
            if (!navigator.credentials.preventSilentAccess) {
              navigator.credentials.preventSilentAccess = async function () {
                return Promise.resolve();
              };
            }

            // Password credentials support (for realism)
            const originalStore = navigator.credentials.store?.bind(navigator.credentials);
            if (originalStore) {
              navigator.credentials.store = async function (credential: Credential) {
                // Add realistic delay for storing
                await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));
                return originalStore(credential);
              };
            }
          }

          // ========================================
          // 4. Payment Request API Consistency
          // ========================================

          // WebAuthn is often used with Payment Request API
          if ((window as any).PaymentRequest && profile.hasPlatformAuthenticator) {
            const OriginalPaymentRequest = (window as any).PaymentRequest;

            (window as any).PaymentRequest = class PaymentRequest extends OriginalPaymentRequest {
              constructor(
                methodData: PaymentMethodData[],
                details: PaymentDetailsInit,
                options?: PaymentOptions
              ) {
                // Ensure canMakePayment reflects authenticator availability
                super(methodData, details, options);

                const originalCanMakePayment = this.canMakePayment.bind(this);
                this.canMakePayment = async function () {
                  const result = await originalCanMakePayment();
                  // Platform authenticator enhances payment capabilities
                  return result || profile.hasPlatformAuthenticator;
                };
              }
            };
          }

          // ========================================
          // 5. FIDO2 Extensions
          // ========================================

          // Some sites check for specific FIDO2 extensions
          if ((window as any).PublicKeyCredential) {
            // Add getClientCapabilities (experimental)
            if (!(window as any).PublicKeyCredential.getClientCapabilities) {
              (window as any).PublicKeyCredential.getClientCapabilities = async function () {
                return {
                  conditionalCreate: profile.hasPlatformAuthenticator,
                  conditionalGet: profile.hasPlatformAuthenticator,
                  hybridTransport: profile.hasExternalAuthenticator,
                  passkeyPlatformAuthenticator: profile.hasPlatformAuthenticator,
                  userVerifyingPlatformAuthenticator: profile.hasPlatformAuthenticator,
                  relatedOrigins: false,
                  signalAllAcceptedCredentials: false,
                  signalCurrentUserDetails: false,
                  signalUnknownCredential: false,
                };
              };
            }
          }
        }

        // ========================================
        // 6. Permissions API for WebAuthn
        // ========================================

        if (navigator.permissions && navigator.permissions.query) {
          const originalQuery = navigator.permissions.query.bind(navigator.permissions);

          navigator.permissions.query = function (permissionDesc: any) {
            // PublicKeyCredential permission (experimental)
            if (
              permissionDesc.name === 'publickey-credentials-get' ||
              permissionDesc.name === 'publickey-credentials-create'
            ) {
              const state = profile.hasPlatformAuthenticator || profile.hasExternalAuthenticator
                ? 'granted'
                : 'denied';

              return Promise.resolve({
                state,
                onchange: null,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true,
              } as PermissionStatus);
            }

            return originalQuery(permissionDesc);
          };
        }

        // ========================================
        // 7. Security Key Detection Prevention
        // ========================================

        // Some sites try to detect if security keys are plugged in via USB
        // This is handled by the bluetooth-usb-protection module

        logger.debug('WebAuthn API protection applied successfully');
      }
    }, this.profile);

    logger.debug('WebAuthn protection scripts injected successfully');
  }

  /**
   * Update WebAuthn profile
   */
  setProfile(profile: WebAuthnProfile): void {
    this.profile = profile;
  }

  /**
   * Get current profile
   */
  getProfile(): WebAuthnProfile {
    return this.profile;
  }

  /**
   * Get module name
   */
  getName(): string {
    return 'WebAuthnProtection';
  }
}
