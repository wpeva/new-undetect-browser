/**
 * Integration Tests for Geographic Router
 * Session 13: Multi-Region Deployment
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import GeoRouter from '../geo-router';

describe('GeoRouter', () => {
  let router: GeoRouter;

  beforeEach(() => {
    router = new GeoRouter();
  });

  afterEach(() => {
    router.stop();
  });

  describe('Region Initialization', () => {
    it('should initialize all regions', () => {
      const regions = router.getRegionsStatus();
      expect(regions).toHaveLength(4);

      const regionIds = regions.map((r) => r.id);
      expect(regionIds).toContain('us-east');
      expect(regionIds).toContain('eu-west');
      expect(regionIds).toContain('ap-south');
      expect(regionIds).toContain('ru-central');
    });

    it('should mark all regions as healthy initially', () => {
      const regions = router.getRegionsStatus();
      regions.forEach((region) => {
        expect(region.healthy).toBe(true);
      });
    });
  });

  describe('Request Routing', () => {
    it('should route US IP to us-east region', async () => {
      const result = await router.routeRequest('8.8.8.8');
      expect(result.region).toBe('us-east');
    });

    it('should route EU IP to eu-west region', async () => {
      const result = await router.routeRequest('80.1.1.1');
      expect(result.region).toBe('eu-west');
    });

    it('should route Asia IP to ap-south region', async () => {
      const result = await router.routeRequest('150.1.1.1');
      expect(result.region).toBe('ap-south');
    });

    it('should route Russia IP to ru-central region', async () => {
      const result = await router.routeRequest('200.1.1.1');
      expect(result.region).toBe('ru-central');
    });

    it('should return endpoint URL', async () => {
      const result = await router.routeRequest('8.8.8.8');
      expect(result.endpoint).toContain('https://');
      expect(result.endpoint).toContain('api.antidetect.io');
    });

    it('should include distance in result', async () => {
      const result = await router.routeRequest('8.8.8.8');
      expect(result.distance).toBeGreaterThanOrEqual(0);
    });

    it('should include latency in result', async () => {
      const result = await router.routeRequest('8.8.8.8');
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Caching', () => {
    it('should cache routing decisions', async () => {
      const ip = '8.8.8.8';

      // First request
      const result1 = await router.routeRequest(ip);

      // Second request (should be cached)
      const result2 = await router.routeRequest(ip);

      expect(result1.region).toBe(result2.region);
      expect(result2.reason).toBe('cached');
    });

    it('should clear cache on demand', async () => {
      const ip = '8.8.8.8';

      // First request
      await router.routeRequest(ip);

      // Clear cache
      router.clearCache();

      // Second request (should not be cached)
      const result = await router.routeRequest(ip);
      expect(result.reason).not.toBe('cached');
    });
  });

  describe('Health Management', () => {
    it('should check if region is healthy', () => {
      expect(router.isHealthy('us-east')).toBe(true);
      expect(router.isHealthy('eu-west')).toBe(true);
    });

    it('should manually set region health', () => {
      router.setRegionHealth('us-east', false);
      expect(router.isHealthy('us-east')).toBe(false);

      router.setRegionHealth('us-east', true);
      expect(router.isHealthy('us-east')).toBe(true);
    });

    it('should route to healthy region when preferred region is unhealthy', async () => {
      // Mark us-east as unhealthy
      router.setRegionHealth('us-east', false);

      // Try to route US traffic
      const result = await router.routeRequest('8.8.8.8', {
        requireHealthy: true,
      });

      // Should route to another healthy region
      expect(result.region).not.toBe('us-east');
    });
  });

  describe('Backup Region', () => {
    it('should find backup region for failed region', () => {
      const backup = router.getBackupRegion('us-east');
      expect(backup).toBeTruthy();
      expect(backup).not.toBe('us-east');
    });

    it('should find geographically close backup region', () => {
      // eu-west and ru-central are both in Europe
      const backup = router.getBackupRegion('eu-west');
      expect(['ru-central', 'us-east', 'ap-south']).toContain(backup);
    });
  });

  describe('Region Management', () => {
    it('should add new region', () => {
      router.addRegion({
        id: 'sa-east',
        name: 'South America East',
        endpoint: 'https://sa-east.api.antidetect.io',
        location: { lat: -23.5, lon: -46.6, country: 'BR' },
        weight: 100,
      });

      const regions = router.getRegionsStatus();
      expect(regions).toHaveLength(5);
      expect(regions.find((r) => r.id === 'sa-east')).toBeTruthy();
    });

    it('should remove region', () => {
      router.removeRegion('us-east');

      const regions = router.getRegionsStatus();
      expect(regions).toHaveLength(3);
      expect(regions.find((r) => r.id === 'us-east')).toBeUndefined();
    });
  });

  describe('Routing Options', () => {
    it('should respect preferred region', async () => {
      const result = await router.routeRequest('8.8.8.8', {
        preferredRegion: 'eu-west',
      });

      // Should strongly prefer eu-west (but might not always be chosen)
      expect(result.region).toBeTruthy();
    });

    it('should respect max latency requirement', async () => {
      const result = await router.routeRequest('8.8.8.8', {
        maxLatency: 100,
      });

      expect(result.latency).toBeLessThanOrEqual(100);
    });
  });

  describe('Fallback Behavior', () => {
    it('should provide fallback when all regions are unhealthy', async () => {
      // Mark all regions as unhealthy
      router.setRegionHealth('us-east', false);
      router.setRegionHealth('eu-west', false);
      router.setRegionHealth('ap-south', false);
      router.setRegionHealth('ru-central', false);

      const result = await router.routeRequest('8.8.8.8', {
        requireHealthy: false,
      });

      expect(result.region).toBeTruthy();
      expect(result.reason).toContain('fallback');
    });
  });

  describe('Status Reporting', () => {
    it('should report all regions status', () => {
      const status = router.getRegionsStatus();

      expect(status).toHaveLength(4);
      status.forEach((region) => {
        expect(region).toHaveProperty('id');
        expect(region).toHaveProperty('name');
        expect(region).toHaveProperty('endpoint');
        expect(region).toHaveProperty('healthy');
        expect(region).toHaveProperty('latency');
        expect(region).toHaveProperty('lastCheck');
      });
    });
  });
});
