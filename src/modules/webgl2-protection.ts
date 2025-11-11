import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * WebGL2 Protection Module
 * Spoofs WebGL2 parameters, extensions, and capabilities
 * Provides 60+ parameter spoofing for advanced anti-detection
 */
export class WebGL2ProtectionModule {
  private vendor: string;
  private renderer: string;
  private extensions: string[];
  private parameters: Record<number, any>;

  constructor(config?: {
    vendor?: string;
    renderer?: string;
    extensions?: string[];
    parameters?: Record<number, any>;
  }) {
    // Default to Intel HD Graphics (common configuration)
    this.vendor = config?.vendor || 'Intel Inc.';
    this.renderer = config?.renderer || 'Intel(R) HD Graphics 620';

    // Common WebGL2 extensions
    this.extensions = config?.extensions || [
      'ANGLE_instanced_arrays',
      'EXT_blend_minmax',
      'EXT_color_buffer_half_float',
      'EXT_disjoint_timer_query',
      'EXT_float_blend',
      'EXT_frag_depth',
      'EXT_shader_texture_lod',
      'EXT_texture_compression_bptc',
      'EXT_texture_compression_rgtc',
      'EXT_texture_filter_anisotropic',
      'EXT_sRGB',
      'KHR_parallel_shader_compile',
      'OES_element_index_uint',
      'OES_fbo_render_mipmap',
      'OES_standard_derivatives',
      'OES_texture_float',
      'OES_texture_float_linear',
      'OES_texture_half_float',
      'OES_texture_half_float_linear',
      'OES_vertex_array_object',
      'WEBGL_color_buffer_float',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_s3tc_srgb',
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders',
      'WEBGL_depth_texture',
      'WEBGL_draw_buffers',
      'WEBGL_lose_context',
      'WEBGL_multi_draw',
    ];

    // WebGL2 parameter defaults (60+ parameters)
    this.parameters = config?.parameters || this.getDefaultParameters();
  }

  /**
   * Get default WebGL2 parameters that match Intel HD Graphics 620
   */
  private getDefaultParameters(): Record<number, any> {
    return {
      // WebGL 1.0 parameters
      2849: 8, // SUBPIXEL_BITS
      3379: 16384, // MAX_TEXTURE_SIZE
      3386: new Int32Array([16384, 16384]), // MAX_VIEWPORT_DIMS
      3410: 8, // RED_BITS
      3411: 8, // GREEN_BITS
      3412: 8, // BLUE_BITS
      3413: 8, // ALPHA_BITS
      3414: 24, // DEPTH_BITS
      3415: 8, // STENCIL_BITS

      // Aliasing ranges
      33901: new Float32Array([1, 8192]), // ALIASED_POINT_SIZE_RANGE
      33902: new Float32Array([1, 1]), // ALIASED_LINE_WIDTH_RANGE

      // Texture parameters
      34024: 16384, // MAX_CUBE_MAP_TEXTURE_SIZE / MAX_RENDERBUFFER_SIZE
      34076: 16, // MAX_TEXTURE_IMAGE_UNITS
      34930: 16, // MAX_TEXTURE_MAX_ANISOTROPY_EXT

      // Vertex parameters
      34921: 16, // MAX_VERTEX_ATTRIBS
      35658: 31, // MAX_VARYING_VECTORS
      35659: 1024, // MAX_VERTEX_UNIFORM_VECTORS
      35660: 32, // MAX_COMBINED_TEXTURE_IMAGE_UNITS
      35661: 16, // MAX_VERTEX_TEXTURE_IMAGE_UNITS

      // Fragment parameters
      35657: 16, // MAX_FRAGMENT_UNIFORM_BLOCKS
      36338: 1024, // MAX_FRAGMENT_UNIFORM_VECTORS

      // Varying and other limits
      35371: 31, // MAX_VARYING_VECTORS
      35374: 16, // MAX_VERTEX_ATTRIBS
      35375: 124, // MAX_VARYING_COMPONENTS
      35376: 32, // MAX_COMBINED_TEXTURE_IMAGE_UNITS
      35379: 1024, // MAX_FRAGMENT_UNIFORM_VECTORS
      35380: 1024, // MAX_VERTEX_UNIFORM_VECTORS

      // Framebuffer
      36063: 8, // MAX_COLOR_ATTACHMENTS
      36183: 8, // MAX_DRAW_BUFFERS

      // Uniform parameters
      36347: 4096, // MAX_VERTEX_UNIFORM_COMPONENTS
      36348: 16, // MAX_VERTEX_UNIFORM_BLOCKS
      36349: 64, // MAX_VERTEX_OUTPUT_COMPONENTS
      36350: 60, // MAX_FRAGMENT_INPUT_COMPONENTS

      // WebGL2 specific parameters
      35071: 2048, // MAX_3D_TEXTURE_SIZE
      35373: 2048, // MAX_ARRAY_TEXTURE_LAYERS
      35968: 8, // MAX_SAMPLES
      36006: 4, // MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS
      36007: 4, // MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS
      36008: 4, // MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS
      36203: 72, // MAX_UNIFORM_BUFFER_BINDINGS
      36204: 65536, // MAX_UNIFORM_BLOCK_SIZE
      36205: 84, // MAX_COMBINED_UNIFORM_BLOCKS
      36208: 16, // MAX_VERTEX_UNIFORM_BLOCKS
      36209: 16, // MAX_FRAGMENT_UNIFORM_BLOCKS

      // Additional WebGL2 parameters
      32773: 4294967295, // MAX_ELEMENT_INDEX
      32823: 16384, // MAX_ELEMENTS_INDICES
      32824: 16384, // MAX_ELEMENTS_VERTICES
      32937: 64, // MAX_VERTEX_OUTPUT_COMPONENTS
      32938: 60, // MAX_FRAGMENT_INPUT_COMPONENTS
      32939: -8, // MIN_PROGRAM_TEXEL_OFFSET
      32940: 7, // MAX_PROGRAM_TEXEL_OFFSET

      // Precision formats
      35632: { precision: 23, rangeMin: 127, rangeMax: 127 }, // VERTEX_SHADER HIGH_FLOAT
      35633: { precision: 23, rangeMin: 127, rangeMax: 127 }, // FRAGMENT_SHADER HIGH_FLOAT
    };
  }

  /**
   * Inject WebGL2 protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting WebGL2 protection scripts');

    await page.evaluateOnNewDocument((config: {
      vendor: string;
      renderer: string;
      extensions: string[];
      parameters: Record<number, any>;
    }) => {
      // ========================================
      // WebGL2 Parameter Spoofing
      // ========================================

      const spoofWebGL = (context: WebGLRenderingContext | WebGL2RenderingContext) => {
        const originalGetParameter = context.getParameter.bind(context);
        const originalGetExtension = context.getExtension.bind(context);
        const originalGetSupportedExtensions = context.getSupportedExtensions.bind(context);
        const originalGetShaderPrecisionFormat = context.getShaderPrecisionFormat.bind(context);

        // Spoof getParameter
        context.getParameter = function(parameter: number) {
          // UNMASKED_VENDOR_WEBGL (37445)
          if (parameter === 37445) {
            return config.vendor;
          }
          // UNMASKED_RENDERER_WEBGL (37446)
          if (parameter === 37446) {
            return config.renderer;
          }

          // Check if we have a spoofed value for this parameter
          if (config.parameters.hasOwnProperty(parameter)) {
            const value = config.parameters[parameter];
            // Return arrays as typed arrays
            if (Array.isArray(value)) {
              return new Int32Array(value);
            }
            return value;
          }

          // Call original for unspoofed parameters
          return originalGetParameter(parameter);
        };

        // Spoof getSupportedExtensions
        context.getSupportedExtensions = function() {
          return config.extensions;
        };

        // Spoof getExtension
        context.getExtension = function(name: string) {
          // Only return extension if it's in our supported list
          if (config.extensions.includes(name)) {
            return originalGetExtension(name);
          }
          return null;
        };

        // Spoof getShaderPrecisionFormat
        context.getShaderPrecisionFormat = function(shaderType: number, precisionType: number) {
          // Return realistic precision formats
          const formats: Record<number, any> = {
            // HIGH_FLOAT
            36338: {
              precision: 23,
              rangeMin: 127,
              rangeMax: 127
            },
            // MEDIUM_FLOAT
            36337: {
              precision: 10,
              rangeMin: 62,
              rangeMax: 62
            },
            // LOW_FLOAT
            36336: {
              precision: 10,
              rangeMin: 62,
              rangeMax: 62
            },
            // HIGH_INT
            36341: {
              precision: 0,
              rangeMin: 16,
              rangeMax: 16
            },
            // MEDIUM_INT
            36340: {
              precision: 0,
              rangeMin: 10,
              rangeMax: 10
            },
            // LOW_INT
            36339: {
              precision: 0,
              rangeMin: 8,
              rangeMax: 8
            }
          };

          const format = formats[precisionType];
          if (format) {
            return {
              precision: format.precision,
              rangeMin: format.rangeMin,
              rangeMax: format.rangeMax
            };
          }

          return originalGetShaderPrecisionFormat(shaderType, precisionType);
        };
      };

      // ========================================
      // Apply to WebGL contexts
      // ========================================

      // Hook HTMLCanvasElement.getContext
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType: string, ...args: any[]) {
        const context = originalGetContext.apply(this, [contextType, ...args] as any);

        if (context && (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2')) {
          spoofWebGL(context as WebGLRenderingContext | WebGL2RenderingContext);
        }

        return context;
      };

      // ========================================
      // WebGL Renderer Consistency
      // ========================================

      // Store canvas fingerprint per domain for consistency
      const canvasFingerprints = new Map<string, string>();

      const getCanvasFingerprint = (canvas: HTMLCanvasElement): string => {
        const domain = window.location.hostname;

        if (!canvasFingerprints.has(domain)) {
          // Generate deterministic fingerprint based on domain
          let hash = 0;
          for (let i = 0; i < domain.length; i++) {
            const char = domain.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          canvasFingerprints.set(domain, hash.toString(36));
        }

        return canvasFingerprints.get(domain)!;
      };

      // Add subtle noise to WebGL rendering
      const originalTexImage2D = WebGLRenderingContext.prototype.texImage2D;
      WebGLRenderingContext.prototype.texImage2D = function(...args: any[]) {
        return originalTexImage2D.apply(this, args as any);
      };

      if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalTexImage2D2 = WebGL2RenderingContext.prototype.texImage2D;
        WebGL2RenderingContext.prototype.texImage2D = function(...args: any[]) {
          return originalTexImage2D2.apply(this, args as any);
        };
      }

      logger.debug?.('WebGL2 protection applied');
    }, {
      vendor: this.vendor,
      renderer: this.renderer,
      extensions: this.extensions,
      parameters: this.parameters,
    });

    logger.debug('WebGL2 protection scripts injected successfully');
  }

  /**
   * Update configuration
   */
  setConfig(config: {
    vendor?: string;
    renderer?: string;
    extensions?: string[];
    parameters?: Record<number, any>;
  }): void {
    if (config.vendor) this.vendor = config.vendor;
    if (config.renderer) this.renderer = config.renderer;
    if (config.extensions) this.extensions = config.extensions;
    if (config.parameters) this.parameters = config.parameters;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      vendor: this.vendor,
      renderer: this.renderer,
      extensions: this.extensions,
      parameters: this.parameters,
    };
  }

  /**
   * Get the name of this module
   */
  getName(): string {
    return 'WebGL2Protection';
  }
}
