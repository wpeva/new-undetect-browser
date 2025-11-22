/**
 * ML Scraper Tests
 * Session 9: Machine Learning Dataset Collection
 */

import { FingerprintScraper } from '../../ml/data-collection/scraper';
import { Fingerprint } from '../../ml/types/fingerprint';

describe('FingerprintScraper', () => {
  let scraper: FingerprintScraper;

  beforeEach(() => {
    scraper = new FingerprintScraper({
      count: 5,
      headless: true,
      delayBetweenRequests: 100,
    });
  });

  describe('Configuration', () => {
    it('should create scraper with default config', () => {
      const defaultScraper = new FingerprintScraper();
      expect(defaultScraper).toBeDefined();
    });

    it('should create scraper with custom config', () => {
      const customScraper = new FingerprintScraper({
        count: 100,
        headless: false,
        timeout: 60000,
      });
      expect(customScraper).toBeDefined();
    });
  });

  describe('Fingerprint Collection', () => {
    it('should collect fingerprints', async () => {
      const fingerprints = await scraper.scrapeRealFingerprints(2);
      expect(fingerprints).toBeDefined();
      expect(Array.isArray(fingerprints)).toBe(true);
      expect(fingerprints.length).toBe(2);
    }, 120000);

    it('should generate valid fingerprint structure', async () => {
      const fingerprints = await scraper.scrapeRealFingerprints(1);
      const fp = fingerprints[0];

      expect(fp).toBeDefined();
      expect(fp.id).toBeDefined();
      expect(fp.timestamp).toBeDefined();
      expect(fp.canvas).toBeDefined();
      expect(fp.webgl).toBeDefined();
      expect(fp.screen).toBeDefined();
      expect(fp.hardware).toBeDefined();
      expect(fp.navigator).toBeDefined();
      expect(fp.metadata).toBeDefined();
    }, 60000);

    it('should collect canvas fingerprint', async () => {
      const fingerprints = await scraper.scrapeRealFingerprints(1);
      const canvas = fingerprints[0].canvas;

      expect(canvas).toBeDefined();
      expect(canvas.hash).toBeDefined();
      expect(canvas.parameters).toBeDefined();
      expect(canvas.parameters.width).toBeGreaterThan(0);
      expect(canvas.parameters.height).toBeGreaterThan(0);
    }, 60000);

    it('should collect WebGL fingerprint', async () => {
      const fingerprints = await scraper.scrapeRealFingerprints(1);
      const webgl = fingerprints[0].webgl;

      expect(webgl).toBeDefined();
      expect(webgl.vendor).toBeDefined();
      expect(webgl.renderer).toBeDefined();
      expect(webgl.extensions).toBeDefined();
      expect(Array.isArray(webgl.extensions)).toBe(true);
    }, 60000);

    it('should collect screen fingerprint', async () => {
      const fingerprints = await scraper.scrapeRealFingerprints(1);
      const screen = fingerprints[0].screen;

      expect(screen).toBeDefined();
      expect(screen.width).toBeGreaterThan(0);
      expect(screen.height).toBeGreaterThan(0);
      expect(screen.colorDepth).toBeGreaterThan(0);
    }, 60000);

    it('should collect hardware fingerprint', async () => {
      const fingerprints = await scraper.scrapeRealFingerprints(1);
      const hardware = fingerprints[0].hardware;

      expect(hardware).toBeDefined();
      expect(hardware.platform).toBeDefined();
      expect(hardware.hardwareConcurrency).toBeGreaterThan(0);
      expect(hardware.userAgent).toBeDefined();
    }, 60000);
  });

  describe('Data Persistence', () => {
    it('should save fingerprints to file', async () => {
      const fs = require('fs');
      const path = require('path');
      const tmpPath = path.join('/tmp', 'test-fingerprints.json');

      await scraper.scrapeRealFingerprints(1);
      await scraper.saveFingerprints(tmpPath);

      expect(fs.existsSync(tmpPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(tmpPath);
    }, 60000);
  });
});
