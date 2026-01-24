// Extended Web APIs type definitions

// WebAuthn / Credential Management API
declare class PasswordCredential extends Credential {
  readonly password: string;
  constructor(data: PasswordCredentialData);
}

interface PasswordCredentialData {
  id: string;
  password: string;
  name?: string;
  iconURL?: string;
}

declare class FederatedCredential extends Credential {
  readonly provider: string;
  constructor(data: FederatedCredentialData);
}

interface FederatedCredentialData {
  id: string;
  provider: string;
  name?: string;
  iconURL?: string;
  protocol?: string;
}

// WebUSB API
interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface USBDevice {
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[];
}

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
}

interface Navigator {
  usb?: USB;
}
