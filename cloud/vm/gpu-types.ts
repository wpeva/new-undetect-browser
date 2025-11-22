/**
 * GPU Virtualization Types
 * Session 7: GPU Virtualization & SwiftShader
 */

export interface GPUProfile {
  vendor: string;
  renderer: string;
  version: string;
  vendorId?: string;
  deviceId?: string;
  driverVersion?: string;
  angle?: string;
  glVersion?: string;
  shadingLanguageVersion?: string;
}

export interface VulkanConfig {
  icdFilename?: string;
  loaderDebug?: boolean;
  layers?: string[];
}

export interface SwiftShaderOptions {
  enableValidation?: boolean;
  enableDebug?: boolean;
  vulkanConfig?: VulkanConfig;
  chromiumFlags?: string[];
}

export type GPUVendor = 'NVIDIA' | 'AMD' | 'Intel' | 'Apple' | 'Qualcomm' | 'ARM' | 'Microsoft';

export interface GPUDeviceInfo {
  vendorId: string;
  deviceId: string;
  name: string;
  architecture?: string;
  memory?: string;
}

export interface GPUCapabilities {
  maxTextureSize: number;
  maxViewportDims: [number, number];
  maxVertexAttribs: number;
  maxVaryingVectors: number;
  maxFragmentUniformVectors: number;
  maxVertexUniformVectors: number;
  aliasedLineWidthRange: [number, number];
  aliasedPointSizeRange: [number, number];
}
