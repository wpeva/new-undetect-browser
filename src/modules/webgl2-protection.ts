/**
 * WebGL2 Protection Module
 *
 * Spoofs WebGL2 parameters, extensions, and shader precision
 * to prevent advanced fingerprinting.
 *
 * This builds on top of basic WebGL protection with WebGL2-specific parameters.
 *
 * CRITICAL for passing:
 * - pixelscan.net (advanced WebGL tests)
 * - browserleaks.com/webgl
 * - creepjs.com
 */

import type { Page } from 'puppeteer';

export interface WebGL2Config {
  enabled: boolean;
  gpu: string; // e.g., "NVIDIA GeForce RTX 3080"
  vendor: string; // e.g., "NVIDIA Corporation"
  customParameters?: Record<number, any>;
  customExtensions?: string[];
}

/**
 * Realistic WebGL2 parameters for different GPUs
 */
const GPU_PROFILES: Record<string, any> = {
  'NVIDIA GeForce RTX 3080': {
    MAX_TEXTURE_SIZE: 32768,
    MAX_CUBE_MAP_TEXTURE_SIZE: 32768,
    MAX_RENDERBUFFER_SIZE: 16384,
    MAX_VIEWPORT_DIMS: [32768, 32768],
    MAX_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 32,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 80,
    MAX_VERTEX_ATTRIBS: 16,
    MAX_VARYING_VECTORS: 31,
    MAX_VERTEX_UNIFORM_VECTORS: 4096,
    MAX_FRAGMENT_UNIFORM_VECTORS: 4096,
    MAX_SAMPLES: 16,
    MAX_COLOR_ATTACHMENTS: 8,
    MAX_DRAW_BUFFERS: 8,
    MAX_3D_TEXTURE_SIZE: 16384,
    MAX_ARRAY_TEXTURE_LAYERS: 2048,
    MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: 4,
    MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 128,
    MAX_UNIFORM_BUFFER_BINDINGS: 84,
    MAX_UNIFORM_BLOCK_SIZE: 65536,
  },
  'NVIDIA GeForce RTX 4090': {
    MAX_TEXTURE_SIZE: 32768,
    MAX_CUBE_MAP_TEXTURE_SIZE: 32768,
    MAX_RENDERBUFFER_SIZE: 16384,
    MAX_VIEWPORT_DIMS: [32768, 32768],
    MAX_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 32,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 96,
    MAX_VERTEX_ATTRIBS: 16,
    MAX_VARYING_VECTORS: 31,
    MAX_VERTEX_UNIFORM_VECTORS: 4096,
    MAX_FRAGMENT_UNIFORM_VECTORS: 4096,
    MAX_SAMPLES: 16,
    MAX_COLOR_ATTACHMENTS: 8,
    MAX_DRAW_BUFFERS: 8,
    MAX_3D_TEXTURE_SIZE: 16384,
    MAX_ARRAY_TEXTURE_LAYERS: 2048,
  },
  'Intel UHD Graphics 630': {
    MAX_TEXTURE_SIZE: 16384,
    MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
    MAX_RENDERBUFFER_SIZE: 16384,
    MAX_VIEWPORT_DIMS: [16384, 16384],
    MAX_TEXTURE_IMAGE_UNITS: 16,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 80,
    MAX_VERTEX_ATTRIBS: 16,
    MAX_VARYING_VECTORS: 30,
    MAX_VERTEX_UNIFORM_VECTORS: 1024,
    MAX_FRAGMENT_UNIFORM_VECTORS: 1024,
    MAX_SAMPLES: 8,
    MAX_COLOR_ATTACHMENTS: 8,
    MAX_DRAW_BUFFERS: 8,
    MAX_3D_TEXTURE_SIZE: 2048,
    MAX_ARRAY_TEXTURE_LAYERS: 2048,
  },
  'AMD Radeon RX 6900 XT': {
    MAX_TEXTURE_SIZE: 16384,
    MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
    MAX_RENDERBUFFER_SIZE: 16384,
    MAX_VIEWPORT_DIMS: [16384, 16384],
    MAX_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 80,
    MAX_VERTEX_ATTRIBS: 16,
    MAX_VARYING_VECTORS: 32,
    MAX_VERTEX_UNIFORM_VECTORS: 4096,
    MAX_FRAGMENT_UNIFORM_VECTORS: 4096,
    MAX_SAMPLES: 16,
    MAX_COLOR_ATTACHMENTS: 8,
    MAX_DRAW_BUFFERS: 8,
    MAX_3D_TEXTURE_SIZE: 16384,
    MAX_ARRAY_TEXTURE_LAYERS: 2048,
  },
  'Apple M2': {
    MAX_TEXTURE_SIZE: 16384,
    MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
    MAX_RENDERBUFFER_SIZE: 16384,
    MAX_VIEWPORT_DIMS: [16384, 16384],
    MAX_TEXTURE_IMAGE_UNITS: 16,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_ATTRIBS: 16,
    MAX_VARYING_VECTORS: 31,
    MAX_VERTEX_UNIFORM_VECTORS: 1024,
    MAX_FRAGMENT_UNIFORM_VECTORS: 1024,
    MAX_SAMPLES: 4,
    MAX_COLOR_ATTACHMENTS: 8,
    MAX_DRAW_BUFFERS: 8,
    MAX_3D_TEXTURE_SIZE: 2048,
    MAX_ARRAY_TEXTURE_LAYERS: 2048,
  },
};

/**
 * Realistic WebGL2 extensions
 */
const WEBGL2_EXTENSIONS = [
  'EXT_color_buffer_float',
  'EXT_color_buffer_half_float',
  'EXT_disjoint_timer_query_webgl2',
  'EXT_float_blend',
  'EXT_texture_compression_bptc',
  'EXT_texture_compression_rgtc',
  'EXT_texture_filter_anisotropic',
  'EXT_texture_norm16',
  'KHR_parallel_shader_compile',
  'OES_draw_buffers_indexed',
  'OES_texture_float_linear',
  'OVR_multiview2',
  'WEBGL_clip_cull_distance',
  'WEBGL_compressed_texture_s3tc',
  'WEBGL_compressed_texture_s3tc_srgb',
  'WEBGL_debug_renderer_info',
  'WEBGL_debug_shaders',
  'WEBGL_lose_context',
  'WEBGL_multi_draw',
];

export class WebGL2Protection {
  private config: WebGL2Config;

  constructor(config: Partial<WebGL2Config> = {}) {
    this.config = {
      enabled: true,
      gpu: 'NVIDIA GeForce RTX 3080',
      vendor: 'NVIDIA Corporation',
      ...config,
    };
  }

  /**
   * Apply WebGL2 protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const parameters = this.getParametersForGPU();
    const extensions = this.config.customExtensions || WEBGL2_EXTENSIONS;

    await page.evaluateOnNewDocument(
      this.getInjectionScript(),
      this.config.vendor,
      this.config.gpu,
      parameters,
      extensions
    );
  }

  /**
   * Get the injection script
   */
  private getInjectionScript() {
    return (
      vendor: string,
      renderer: string,
      parameters: Record<number, any>,
      allowedExtensions: string[]
    ) => {
      // Store original methods
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalGetParameter = WebGL2RenderingContext.prototype.getParameter;
      const originalGetExtension = WebGL2RenderingContext.prototype.getExtension;
      const originalGetSupportedExtensions =
        WebGL2RenderingContext.prototype.getSupportedExtensions;

      /**
       * Override getContext to intercept WebGL2 contexts
       */
      HTMLCanvasElement.prototype.getContext = function (
        contextType: string,
        ...args: any[]
      ) {
        const context = originalGetContext.call(this, contextType, ...args);

        if (
          context &&
          (contextType === 'webgl2' || contextType === 'experimental-webgl2')
        ) {
          return patchWebGL2Context(context as WebGL2RenderingContext);
        }

        return context;
      };

      /**
       * Patch WebGL2 context
       */
      function patchWebGL2Context(gl: WebGL2RenderingContext): WebGL2RenderingContext {
        // Override getParameter
        gl.getParameter = function (pname: number) {
          // Vendor and renderer
          if (pname === 0x1f00) {
            // VENDOR
            return vendor;
          }
          if (pname === 0x1f01) {
            // RENDERER
            return renderer;
          }

          // Unmasked vendor/renderer (from WEBGL_debug_renderer_info)
          if (pname === 0x9245) {
            // UNMASKED_VENDOR_WEBGL
            return vendor;
          }
          if (pname === 0x9246) {
            // UNMASKED_RENDERER_WEBGL
            return renderer;
          }

          // Custom parameters
          if (pname in parameters) {
            return parameters[pname];
          }

          // WebGL2-specific parameters
          const webgl2Params: Record<number, any> = {
            0x8073: parameters.MAX_3D_TEXTURE_SIZE || 16384, // MAX_3D_TEXTURE_SIZE
            0x88ff: parameters.MAX_ARRAY_TEXTURE_LAYERS || 2048, // MAX_ARRAY_TEXTURE_LAYERS
            0x8c29: parameters.MAX_COLOR_ATTACHMENTS || 8, // MAX_COLOR_ATTACHMENTS
            0x8824: parameters.MAX_DRAW_BUFFERS || 8, // MAX_DRAW_BUFFERS
            0x8cdf: parameters.MAX_SAMPLES || 16, // MAX_SAMPLES
            0x8c8a:
              parameters.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS || 4, // MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS
            0x8c8b:
              parameters.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS || 128,
            0x8a2f: parameters.MAX_UNIFORM_BUFFER_BINDINGS || 84,
            0x8a30: parameters.MAX_UNIFORM_BLOCK_SIZE || 65536,
            0x8dfb: parameters.MAX_VERTEX_UNIFORM_BLOCKS || 16,
            0x8dfa: parameters.MAX_FRAGMENT_UNIFORM_BLOCKS || 16,
            0x8a34: parameters.MAX_COMBINED_UNIFORM_BLOCKS || 84,
          };

          if (pname in webgl2Params) {
            return webgl2Params[pname];
          }

          // Call original
          return originalGetParameter.call(gl, pname);
        };

        // Override getExtension
        gl.getExtension = function (name: string) {
          // Only allow whitelisted extensions
          if (!allowedExtensions.includes(name)) {
            return null;
          }

          return originalGetExtension.call(gl, name);
        };

        // Override getSupportedExtensions
        gl.getSupportedExtensions = function () {
          // Return only allowed extensions
          const supported = originalGetSupportedExtensions.call(gl) || [];
          return supported.filter((ext: string) => allowedExtensions.includes(ext));
        };

        // Override getShaderPrecisionFormat for consistency
        const originalGetShaderPrecisionFormat = gl.getShaderPrecisionFormat;
        gl.getShaderPrecisionFormat = function (
          shaderType: number,
          precisionType: number
        ) {
          const result = originalGetShaderPrecisionFormat.call(
            gl,
            shaderType,
            precisionType
          );

          if (!result) return result;

          // Return consistent precision values
          return {
            rangeMin: 127,
            rangeMax: 127,
            precision: 23,
          } as WebGLShaderPrecisionFormat;
        };

        return gl;
      }

      // Fix toString
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function () {
        if (this === HTMLCanvasElement.prototype.getContext) {
          return 'function getContext() { [native code] }';
        }
        if (this === WebGL2RenderingContext.prototype.getParameter) {
          return 'function getParameter() { [native code] }';
        }
        if (this === WebGL2RenderingContext.prototype.getExtension) {
          return 'function getExtension() { [native code] }';
        }
        if (this === WebGL2RenderingContext.prototype.getSupportedExtensions) {
          return 'function getSupportedExtensions() { [native code] }';
        }
        return originalToString.call(this);
      };

      // Log for debugging
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `[WebGL2 Protection] Applied for ${renderer} (${allowedExtensions.length} extensions)`
        );
      }
    };
  }

  /**
   * Get parameters for the configured GPU
   */
  private getParametersForGPU(): Record<number, any> {
    if (this.config.customParameters) {
      return this.config.customParameters;
    }

    const profile = GPU_PROFILES[this.config.gpu];
    if (!profile) {
      return GPU_PROFILES['NVIDIA GeForce RTX 3080'];
    }

    // Convert to WebGL2 constant values
    const params: Record<number, any> = {
      0x0d33: profile.MAX_TEXTURE_SIZE, // MAX_TEXTURE_SIZE
      0x851c: profile.MAX_CUBE_MAP_TEXTURE_SIZE, // MAX_CUBE_MAP_TEXTURE_SIZE
      0x84e8: profile.MAX_RENDERBUFFER_SIZE, // MAX_RENDERBUFFER_SIZE
      0x0d3a: profile.MAX_VIEWPORT_DIMS, // MAX_VIEWPORT_DIMS
      0x8872: profile.MAX_VERTEX_ATTRIBS, // MAX_VERTEX_ATTRIBS
      0x8869: profile.MAX_VARYING_VECTORS, // MAX_VARYING_VECTORS
      0x8dfb: profile.MAX_VERTEX_UNIFORM_VECTORS, // MAX_VERTEX_UNIFORM_VECTORS
      0x8dfd: profile.MAX_FRAGMENT_UNIFORM_VECTORS, // MAX_FRAGMENT_UNIFORM_VECTORS
      0x8b4d: profile.MAX_TEXTURE_IMAGE_UNITS, // MAX_TEXTURE_IMAGE_UNITS
      0x8b4c: profile.MAX_VERTEX_TEXTURE_IMAGE_UNITS, // MAX_VERTEX_TEXTURE_IMAGE_UNITS
      0x8b4d: profile.MAX_COMBINED_TEXTURE_IMAGE_UNITS, // MAX_COMBINED_TEXTURE_IMAGE_UNITS
    };

    return params;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WebGL2Config>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory function
 */
export function createWebGL2Protection(
  config?: Partial<WebGL2Config>
): WebGL2Protection {
  return new WebGL2Protection(config);
}

/**
 * Apply to multiple pages
 */
export async function applyWebGL2ProtectionToPages(
  pages: Page[],
  config?: Partial<WebGL2Config>
): Promise<void> {
  const protection = new WebGL2Protection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
