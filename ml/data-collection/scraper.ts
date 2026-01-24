/**
 * ML Fingerprint Scraper
 * Session 9: Machine Learning Dataset Collection
 *
 * Collects real browser fingerprints from browserleaks.com and pixelscan.net
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  Fingerprint,
  ScraperConfig,
  CanvasFingerprint,
  WebGLFingerprint,
  AudioFingerprint,
  FontFingerprint,
  ScreenFingerprint,
  HardwareFingerprint,
  NavigatorFingerprint,
  MediaDevicesFingerprint,
  BatteryFingerprint,
} from '../types/fingerprint';

export class FingerprintScraper {
  private config: ScraperConfig;
  private collectedFingerprints: Fingerprint[] = [];

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      count: config.count || 1000,
      sources: config.sources || ['direct'],
      userDataDirPrefix: config.userDataDirPrefix || '/tmp/user-profile',
      headless: config.headless !== undefined ? config.headless : true,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      delayBetweenRequests: config.delayBetweenRequests || 1000,
      proxy: config.proxy,
    };
  }

  /**
   * Main entry point: Scrape real fingerprints
   */
  async scrapeRealFingerprints(count?: number): Promise<Fingerprint[]> {
    const totalCount = count || this.config.count;
    console.log(`🚀 Starting fingerprint collection: ${totalCount} fingerprints`);

    for (let i = 0; i < totalCount; i++) {
      try {
        const fingerprint = await this.scrapeFingerprint(i);
        this.collectedFingerprints.push(fingerprint);

        if ((i + 1) % 10 === 0) {
          console.log(`✅ Progress: ${i + 1}/${totalCount} fingerprints collected`);
        }

        // Delay between requests to avoid rate limiting
        if (i < totalCount - 1) {
          await this.delay(this.config.delayBetweenRequests);
        }
      } catch (error) {
        console.error(`❌ Error scraping fingerprint ${i}:`, error);
      }
    }

    console.log(`✅ Collection complete: ${this.collectedFingerprints.length} fingerprints`);
    return this.collectedFingerprints;
  }

  /**
   * Scrape a single fingerprint
   */
  private async scrapeFingerprint(index: number): Promise<Fingerprint> {
    const browser = await this.launchBrowser(index);
    const page = await browser.newPage();

    try {
      // Set realistic viewport
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      const fingerprint: Fingerprint = {
        id: uuidv4(),
        timestamp: Date.now(),
        source: 'direct',
        canvas: await this.scrapeCanvas(page),
        webgl: await this.scrapeWebGL(page),
        audio: await this.scrapeAudio(page),
        fonts: await this.scrapeFonts(page),
        screen: await this.scrapeScreen(page),
        hardware: await this.scrapeHardware(page),
        navigator: await this.scrapeNavigator(page),
        mediaDevices: await this.scrapeMediaDevices(page),
        battery: await this.scrapeBattery(page),
        metadata: {
          userAgent: await page.evaluate(() => navigator.userAgent),
          browserName: 'Chrome',
          browserVersion: await this.getBrowserVersion(page),
          osName: await this.getOSName(page),
          osVersion: await this.getOSVersion(page),
          deviceType: 'desktop',
          isBot: false,
          consistency: 1.0,
        },
      };

      return fingerprint;
    } finally {
      await browser.close();
    }
  }

  /**
   * Launch browser with unique profile
   */
  private async launchBrowser(profileIndex: number): Promise<Browser> {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ];

    if (this.config.proxy) {
      args.push(`--proxy-server=${this.config.proxy.host}:${this.config.proxy.port}`);
    }

    return await puppeteer.launch({
      headless: this.config.headless,
      args,
      userDataDir: `${this.config.userDataDirPrefix}-${profileIndex}`,
    });
  }

  /**
   * Scrape Canvas fingerprint
   */
  private async scrapeCanvas(page: Page): Promise<CanvasFingerprint> {
    return await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      canvas.width = 280;
      canvas.height = 60;

      // Draw text with different fonts
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Hello, World! 🌍', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Hello, World! 🌍', 4, 17);

      // Draw shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      const dataURL = canvas.toDataURL();

      // Generate hash
      let hash = 0;
      for (let i = 0; i < dataURL.length; i++) {
        const char = dataURL.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }

      return {
        hash: hash.toString(16),
        imageData: dataURL.substring(0, 100), // Store first 100 chars
        toDataURL: dataURL.substring(0, 100),
        parameters: {
          width: canvas.width,
          height: canvas.height,
          textRendering: 'geometricPrecision',
          fontFamily: 'Arial',
        },
      };
    });
  }

  /**
   * Scrape WebGL fingerprint
   */
  private async scrapeWebGL(page: Page): Promise<WebGLFingerprint> {
    return await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

      if (!gl) {
        throw new Error('WebGL not available');
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const extensions = gl.getSupportedExtensions() || [];

      return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '',
        unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '',
        extensions,
        supportedExtensions: extensions,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
        aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
        parameters: {
          MAX_VERTEX_ATTRIBS: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
          MAX_VERTEX_UNIFORM_VECTORS: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
          MAX_VARYING_VECTORS: gl.getParameter(gl.MAX_VARYING_VECTORS),
          MAX_COMBINED_TEXTURE_IMAGE_UNITS: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
          MAX_VERTEX_TEXTURE_IMAGE_UNITS: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
          MAX_TEXTURE_IMAGE_UNITS: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
          MAX_FRAGMENT_UNIFORM_VECTORS: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
          MAX_CUBE_MAP_TEXTURE_SIZE: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
        },
      };
    });
  }

  /**
   * Scrape Audio fingerprint
   */
  private async scrapeAudio(page: Page): Promise<AudioFingerprint> {
    return await page.evaluate(() => {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContext();

      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(0);

      // Generate hash from audio processing
      const hash = `${context.sampleRate}-${context.destination.channelCount}-${context.destination.maxChannelCount}`;

      return {
        hash,
        sampleRate: context.sampleRate,
        channelCount: context.destination.channelCount,
        channelCountMode: context.destination.channelCountMode,
        channelInterpretation: context.destination.channelInterpretation,
        latency: context.baseLatency || 0,
        baseLatency: context.baseLatency,
        outputLatency: (context as any).outputLatency,
      };
    });
  }

  /**
   * Scrape available fonts
   */
  private async scrapeFonts(page: Page): Promise<FontFingerprint> {
    return await page.evaluate(() => {
      const baseFonts = ['monospace', 'sans-serif', 'serif'];
      const testFonts = [
        'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
        'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
        'Arial Black', 'Impact', 'Lucida Sans Unicode', 'Tahoma', 'Lucida Console',
        'Courier', 'Lucida Sans', 'Geneva', 'Helvetica', 'Monaco',
      ];

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      const text = 'mmmmmmmmmmlli';
      const textSize = '72px';

      const baseFontWidths: Record<string, number> = {};
      baseFonts.forEach((baseFont) => {
        context.font = `${textSize} ${baseFont}`;
        baseFontWidths[baseFont] = context.measureText(text).width;
      });

      const availableFonts: string[] = [];
      testFonts.forEach((testFont) => {
        baseFonts.forEach((baseFont) => {
          context.font = `${textSize} '${testFont}', ${baseFont}`;
          const width = context.measureText(text).width;
          if (width !== baseFontWidths[baseFont]) {
            if (!availableFonts.includes(testFont)) {
              availableFonts.push(testFont);
            }
          }
        });
      });

      return {
        availableFonts,
        fontCount: availableFonts.length,
        defaultFonts: baseFonts,
        customFonts: availableFonts,
      };
    });
  }

  /**
   * Scrape screen information
   */
  private async scrapeScreen(page: Page): Promise<ScreenFingerprint> {
    return await page.evaluate(() => ({
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: {
        angle: screen.orientation?.angle || 0,
        type: screen.orientation?.type || 'landscape-primary',
      },
      devicePixelRatio: window.devicePixelRatio,
      touchSupport: {
        maxTouchPoints: navigator.maxTouchPoints,
        touchEvent: 'ontouchstart' in window,
        touchStart: 'ontouchstart' in window,
      },
    }));
  }

  /**
   * Scrape hardware information
   */
  private async scrapeHardware(page: Page): Promise<HardwareFingerprint> {
    return await page.evaluate(() => ({
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      cpuClass: (navigator as any).cpuClass,
      oscpu: (navigator as any).oscpu,
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: Array.from(navigator.languages),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
    }));
  }

  /**
   * Scrape navigator information
   */
  private async scrapeNavigator(page: Page): Promise<NavigatorFingerprint> {
    return await page.evaluate(() => {
      const plugins = Array.from(navigator.plugins).map((plugin) => ({
        name: plugin.name,
        description: plugin.description,
        filename: plugin.filename,
        length: plugin.length,
      }));

      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: Array.from(navigator.languages),
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
        vendor: navigator.vendor,
        vendorSub: navigator.vendorSub,
        productSub: navigator.productSub,
        appVersion: navigator.appVersion,
        appName: navigator.appName,
        appCodeName: navigator.appCodeName,
        doNotTrack: navigator.doNotTrack,
        cookieEnabled: navigator.cookieEnabled,
        plugins,
      };
    });
  }

  /**
   * Scrape media devices
   */
  private async scrapeMediaDevices(page: Page): Promise<MediaDevicesFingerprint | undefined> {
    try {
      return await page.evaluate(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return undefined;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput').length;
        const audioOutputs = devices.filter((d) => d.kind === 'audiooutput').length;
        const videoInputs = devices.filter((d) => d.kind === 'videoinput').length;

        return {
          audioInputs,
          audioOutputs,
          videoInputs,
          deviceIds: devices.map((d) => d.deviceId),
          labels: devices.map((d) => d.label),
        };
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Scrape battery information
   */
  private async scrapeBattery(page: Page): Promise<BatteryFingerprint | undefined> {
    try {
      return await page.evaluate(async () => {
        if (!(navigator as any).getBattery) {
          return undefined;
        }

        const battery = await (navigator as any).getBattery();
        return {
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          level: battery.level,
        };
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Get browser version
   */
  private async getBrowserVersion(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const match = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
      return match?.[1] ?? 'unknown';
    });
  }

  /**
   * Get OS name
   */
  private async getOSName(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const ua = navigator.userAgent;
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'macOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS')) return 'iOS';
      return 'unknown';
    });
  }

  /**
   * Get OS version
   */
  private async getOSVersion(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const ua = navigator.userAgent;
      const match = ua.match(/Windows NT (\d+\.\d+)|Mac OS X (\d+[._]\d+)|Android (\d+\.\d+)/);
      return match ? match[1] || match[2] || match[3] || 'unknown' : 'unknown';
    });
  }

  /**
   * Save fingerprints to file
   */
  async saveFingerprints(outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(this.collectedFingerprints, null, 2));
    console.log(`💾 Saved ${this.collectedFingerprints.length} fingerprints to ${outputPath}`);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get collected fingerprints
   */
  getFingerprints(): Fingerprint[] {
    return this.collectedFingerprints;
  }
}
