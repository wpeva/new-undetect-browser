import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { WebGL2ProtectionModule } from '../../src/modules/webgl2-protection';

describe('WebGL2ProtectionModule', () => {
  let browser: Browser;
  let page: Page;
  let protection: WebGL2ProtectionModule;

  beforeEach(async () => {
    protection = new WebGL2ProtectionModule({
      vendor: 'Intel Inc.',
      renderer: 'Intel(R) HD Graphics 620',
    });

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    page = await browser.newPage();
    await protection.inject(page);
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('WebGL Vendor and Renderer', () => {
    it('should spoof UNMASKED_VENDOR_WEBGL', async () => {
      const vendor = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return null;

        return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      });

      expect(vendor).toBe('Intel Inc.');
    });

    it('should spoof UNMASKED_RENDERER_WEBGL', async () => {
      const renderer = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return null;

        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      });

      expect(renderer).toBe('Intel(R) HD Graphics 620');
    });

    it('should spoof vendor for WebGL2', async () => {
      const vendor = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return null;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return null;

        return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      });

      expect(vendor).toBe('Intel Inc.');
    });
  });

  describe('WebGL Parameters', () => {
    it('should spoof MAX_TEXTURE_SIZE', async () => {
      const maxTextureSize = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        return gl.getParameter(gl.MAX_TEXTURE_SIZE);
      });

      expect(maxTextureSize).toBe(16384);
    });

    it('should spoof MAX_VERTEX_TEXTURE_IMAGE_UNITS', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        return gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
      });

      expect(result).toBe(16);
    });

    it('should spoof MAX_COMBINED_TEXTURE_IMAGE_UNITS', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        return gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
      });

      expect(result).toBe(32);
    });

    it('should spoof MAX_VERTEX_ATTRIBS', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        return gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      });

      expect(result).toBeGreaterThanOrEqual(8);
    });

    it('should spoof MAX_VIEWPORT_DIMS', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        return Array.isArray(dims) ? dims : null;
      });

      expect(result).toBeTruthy();
      expect(result?.length).toBe(2);
    });

    it('should spoof ALIASED_POINT_SIZE_RANGE', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
        return Array.isArray(range) ? range : null;
      });

      expect(result).toBeTruthy();
      expect(result?.length).toBe(2);
    });

    it('should spoof color buffer bits', async () => {
      const bits = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        return {
          red: gl.getParameter(gl.RED_BITS),
          green: gl.getParameter(gl.GREEN_BITS),
          blue: gl.getParameter(gl.BLUE_BITS),
          alpha: gl.getParameter(gl.ALPHA_BITS),
          depth: gl.getParameter(gl.DEPTH_BITS),
          stencil: gl.getParameter(gl.STENCIL_BITS),
        };
      });

      expect(bits?.red).toBe(8);
      expect(bits?.green).toBe(8);
      expect(bits?.blue).toBe(8);
      expect(bits?.alpha).toBe(8);
      expect(bits?.depth).toBe(24);
      expect(bits?.stencil).toBe(8);
    });
  });

  describe('WebGL2 Specific Parameters', () => {
    it('should spoof MAX_3D_TEXTURE_SIZE for WebGL2', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return null;

        // @ts-ignore - WebGL2 constant
        return gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
      });

      if (result !== null) {
        expect(result).toBe(2048);
      }
    });

    it('should spoof MAX_ARRAY_TEXTURE_LAYERS for WebGL2', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return null;

        // @ts-ignore - WebGL2 constant
        return gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
      });

      if (result !== null) {
        expect(result).toBe(2048);
      }
    });

    it('should spoof MAX_UNIFORM_BUFFER_BINDINGS for WebGL2', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return null;

        // @ts-ignore - WebGL2 constant
        return gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS);
      });

      if (result !== null) {
        expect(result).toBe(72);
      }
    });

    it('should spoof MAX_SAMPLES for WebGL2', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return null;

        // @ts-ignore - WebGL2 constant
        return gl.getParameter(gl.MAX_SAMPLES);
      });

      if (result !== null) {
        expect(result).toBe(8);
      }
    });
  });

  describe('WebGL Extensions', () => {
    it('should return consistent supported extensions', async () => {
      const extensions = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        return gl.getSupportedExtensions();
      });

      expect(extensions).toBeTruthy();
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions?.length).toBeGreaterThan(0);
    });

    it('should only return supported extensions', async () => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        const supportedExtensions = gl.getSupportedExtensions() || [];

        // Try to get a supported extension
        const testExt = supportedExtensions[0];
        const extension = gl.getExtension(testExt);

        return {
          supported: supportedExtensions,
          testExt,
          extensionExists: extension !== null,
        };
      });

      expect(result?.supported).toBeTruthy();
      expect(result?.extensionExists).toBe(true);
    });

    it('should return null for unsupported extensions', async () => {
      const extension = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return undefined;

        return gl.getExtension('FAKE_EXTENSION_12345');
      });

      expect(extension).toBeNull();
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating configuration', () => {
      protection.setConfig({
        vendor: 'NVIDIA Corporation',
        renderer: 'NVIDIA GeForce GTX 1080',
      });

      const config = protection.getConfig();
      expect(config.vendor).toBe('NVIDIA Corporation');
      expect(config.renderer).toBe('NVIDIA GeForce GTX 1080');
    });

    it('should return module name', () => {
      expect(protection.getName()).toBe('WebGL2Protection');
    });
  });

  describe('Multiple Canvas Contexts', () => {
    it('should spoof parameters consistently across multiple contexts', async () => {
      const results = await page.evaluate(() => {
        const canvas1 = document.createElement('canvas');
        const canvas2 = document.createElement('canvas');

        const gl1 = canvas1.getContext('webgl');
        const gl2 = canvas2.getContext('webgl');

        if (!gl1 || !gl2) return null;

        const debugInfo1 = gl1.getExtension('WEBGL_debug_renderer_info');
        const debugInfo2 = gl2.getExtension('WEBGL_debug_renderer_info');

        if (!debugInfo1 || !debugInfo2) return null;

        return {
          vendor1: gl1.getParameter(debugInfo1.UNMASKED_VENDOR_WEBGL),
          vendor2: gl2.getParameter(debugInfo2.UNMASKED_VENDOR_WEBGL),
          renderer1: gl1.getParameter(debugInfo1.UNMASKED_RENDERER_WEBGL),
          renderer2: gl2.getParameter(debugInfo2.UNMASKED_RENDERER_WEBGL),
          maxTexture1: gl1.getParameter(gl1.MAX_TEXTURE_SIZE),
          maxTexture2: gl2.getParameter(gl2.MAX_TEXTURE_SIZE),
        };
      });

      expect(results?.vendor1).toBe(results?.vendor2);
      expect(results?.renderer1).toBe(results?.renderer2);
      expect(results?.maxTexture1).toBe(results?.maxTexture2);
    });
  });
});
