/**
 * GPU Virtualization Module
 * Session 7: GPU Virtualization & SwiftShader
 *
 * Export all GPU virtualization components
 */

export * from './gpu-types';
export * from './gpu-database';
export * from './swiftshader-config';

// Re-export commonly used items
export {
  SwiftShaderConfig,
  swiftShaderConfig
} from './swiftshader-config';

export {
  GPUProfile,
  GPUVendor,
  GPUDeviceInfo,
  SwiftShaderOptions
} from './gpu-types';

export {
  NVIDIA_DEVICES,
  AMD_DEVICES,
  INTEL_DEVICES,
  APPLE_DEVICES,
  GPU_VENDOR_IDS,
  getGPUDevice,
  getRandomGPU
} from './gpu-database';
