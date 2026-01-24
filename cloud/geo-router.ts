/**
 * Session 13: Multi-Region Deployment
 * Geographic Router - Routes requests to nearest healthy region
 */

import { createHash } from 'crypto';
import http from 'http';
import https from 'https';

// Types
export interface Location {
  lat: number;
  lon: number;
  country?: string;
  city?: string;
  continent?: string;
}

export interface Region {
  id: string;
  name: string;
  endpoint: string;
  location: Location;
  weight: number;  // Higher weight = higher priority
  maxLatencyMs?: number;  // Maximum acceptable latency
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

export interface RouteResult {
  region: string;
  endpoint: string;
  distance: number;
  latency: number;
  reason: string;
}

// Configuration
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const MAX_CONSECUTIVE_FAILURES = 3;
const CACHE_TTL = 300000; // 5 minutes
const EARTH_RADIUS_KM = 6371;

/**
 * Geographic Router Class
 * Routes client requests to the nearest healthy regional cluster
 */
export class GeoRouter {
  private regions: Map<string, Region>;
  private healthStatus: Map<string, HealthStatus>;
  private routingCache: Map<string, { region: string; timestamp: number }>;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.regions = new Map();
    this.healthStatus = new Map();
    this.routingCache = new Map();
    this.initializeRegions();
    this.startHealthChecks();
  }

  /**
   * Initialize regional endpoints
   */
  private initializeRegions(): void {
    const regions: Region[] = [
      {
        id: 'us-east',
        name: 'US East (Virginia)',
        endpoint: 'https://us-east.api.antidetect.io',
        location: { lat: 37.5, lon: -77.5, country: 'US', continent: 'NA' },
        weight: 100,
        maxLatencyMs: 200,
      },
      {
        id: 'eu-west',
        name: 'EU West (Ireland)',
        endpoint: 'https://eu-west.api.antidetect.io',
        location: { lat: 53.3, lon: -6.2, country: 'IE', continent: 'EU' },
        weight: 100,
        maxLatencyMs: 150,
      },
      {
        id: 'ap-south',
        name: 'Asia Pacific (Singapore)',
        endpoint: 'https://ap-south.api.antidetect.io',
        location: { lat: 1.3, lon: 103.8, country: 'SG', continent: 'AS' },
        weight: 100,
        maxLatencyMs: 250,
      },
      {
        id: 'ru-central',
        name: 'Russia Central (Moscow)',
        endpoint: 'https://ru-central.api.antidetect.io',
        location: { lat: 55.7, lon: 37.6, country: 'RU', continent: 'EU' },
        weight: 100,
        maxLatencyMs: 150,
      },
    ];

    regions.forEach((region) => {
      this.regions.set(region.id, region);
      this.healthStatus.set(region.id, {
        healthy: true,
        latencyMs: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0,
      });
    });
  }

  /**
   * Route request to optimal region
   */
  async routeRequest(clientIP: string, options?: {
    preferredRegion?: string;
    requireHealthy?: boolean;
    maxLatency?: number;
  }): Promise<RouteResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(clientIP);
    const cached = this.routingCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const region = this.regions.get(cached.region);
      if (region && this.isHealthy(cached.region)) {
        const health = this.healthStatus.get(cached.region)!;
        return {
          region: cached.region,
          endpoint: region.endpoint,
          distance: 0,
          latency: health.latencyMs,
          reason: 'cached',
        };
      }
    }

    // Get client location
    const clientLocation = await this.geolocate(clientIP);

    // Find optimal region
    const result = this.findOptimalRegion(clientLocation, options);

    // Cache the result
    this.routingCache.set(cacheKey, {
      region: result.region,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Find optimal region based on location and health
   */
  private findOptimalRegion(
    clientLocation: Location,
    options?: {
      preferredRegion?: string;
      requireHealthy?: boolean;
      maxLatency?: number;
    }
  ): RouteResult {
    const scores: Array<{
      regionId: string;
      score: number;
      distance: number;
      latency: number;
      reason: string;
    }> = [];

    for (const [regionId, region] of this.regions) {
      const health = this.healthStatus.get(regionId)!;

      // Skip unhealthy regions if required
      if (options?.requireHealthy !== false && !health.healthy) {
        continue;
      }

      // Skip regions with high latency
      if (options?.maxLatency && health.latencyMs > options.maxLatency) {
        continue;
      }

      // Calculate distance
      const distance = this.calculateDistance(clientLocation, region.location);

      // Calculate score (lower is better)
      let score = distance;

      // Factor in latency
      score += health.latencyMs / 10;

      // Factor in region weight
      score *= (100 / region.weight);

      // Preferred region bonus
      if (options?.preferredRegion === regionId) {
        score *= 0.5; // 50% bonus
      }

      scores.push({
        regionId,
        score,
        distance,
        latency: health.latencyMs,
        reason: 'optimal',
      });
    }

    // Sort by score
    scores.sort((a, b) => a.score - b.score);

    if (scores.length === 0) {
      // Fallback: use any region, even if unhealthy
      const fallbackRegion = Array.from(this.regions.values())[0];
      const fallbackHealth = this.healthStatus.get(fallbackRegion.id)!;
      return {
        region: fallbackRegion.id,
        endpoint: fallbackRegion.endpoint,
        distance: 0,
        latency: fallbackHealth.latencyMs,
        reason: 'fallback-no-healthy-regions',
      };
    }

    const best = scores[0];
    const region = this.regions.get(best.regionId)!;

    return {
      region: best.regionId,
      endpoint: region.endpoint,
      distance: best.distance,
      latency: best.latency,
      reason: best.reason,
    };
  }

  /**
   * Geolocate IP address using real GeoIP service
   * Uses ip-api.com with fallback to ipwhois.app
   */
  private async geolocate(ip: string): Promise<Location> {
    // Handle local IPs
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') ||
        ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
      return { lat: 37.5, lon: -77.5, country: 'US', continent: 'NA' };
    }

    // Try ip-api.com first (faster, no SSL overhead)
    try {
      const result = await this.fetchGeoIP(ip, 'http://ip-api.com/json/', false);
      if (result) return result;
    } catch (error) {
      console.error('ip-api.com failed:', error);
    }

    // Fallback to ipwhois.app
    try {
      const result = await this.fetchGeoIP(ip, 'http://ipwhois.app/json/', false);
      if (result) return result;
    } catch (error) {
      console.error('ipwhois.app failed:', error);
    }

    // Final fallback - return US location
    return { lat: 37.5, lon: -77.5, country: 'US', continent: 'NA' };
  }

  /**
   * Fetch geolocation data from API
   */
  private fetchGeoIP(ip: string, baseUrl: string, useHttps: boolean): Promise<Location | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);

      const url = `${baseUrl}${ip}`;
      const httpModule = useHttps ? https : http;

      const req = httpModule.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GeoRouter/1.0)',
          'Accept': 'application/json',
        },
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeout);
          try {
            const json = JSON.parse(data);

            // Handle ip-api.com format
            if (json.status === 'success' || json.lat !== undefined) {
              resolve({
                lat: json.lat || json.latitude || 0,
                lon: json.lon || json.longitude || 0,
                country: json.countryCode || json.country_code || json.country,
                city: json.city,
                continent: json.continent || this.getContinent(json.countryCode || json.country_code),
              });
              return;
            }

            // Handle ipwhois.app format
            if (json.success !== false && json.latitude !== undefined) {
              resolve({
                lat: json.latitude,
                lon: json.longitude,
                country: json.country_code,
                city: json.city,
                continent: json.continent_code || this.getContinent(json.country_code),
              });
              return;
            }

            resolve(null);
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });

      req.on('timeout', () => {
        clearTimeout(timeout);
        req.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Get continent code from country code
   */
  private getContinent(countryCode: string): string {
    const continents: Record<string, string> = {
      // North America
      US: 'NA', CA: 'NA', MX: 'NA',
      // Europe
      GB: 'EU', DE: 'EU', FR: 'EU', IT: 'EU', ES: 'EU', NL: 'EU', BE: 'EU', AT: 'EU',
      CH: 'EU', SE: 'EU', NO: 'EU', DK: 'EU', FI: 'EU', PL: 'EU', CZ: 'EU', PT: 'EU',
      GR: 'EU', IE: 'EU', RU: 'EU', UA: 'EU', TR: 'EU',
      // Asia
      CN: 'AS', JP: 'AS', KR: 'AS', IN: 'AS', SG: 'AS', HK: 'AS', TW: 'AS', TH: 'AS',
      VN: 'AS', ID: 'AS', MY: 'AS', PH: 'AS', AE: 'AS', SA: 'AS', IL: 'AS',
      // South America
      BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA', VE: 'SA',
      // Oceania
      AU: 'OC', NZ: 'OC',
      // Africa
      ZA: 'AF', EG: 'AF', NG: 'AF', KE: 'AF',
    };
    return continents[countryCode] || 'NA';
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(loc1: Location, loc2: Location): number {
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lon - loc1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) *
        Math.cos(this.toRadians(loc2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = EARTH_RADIUS_KM * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Check if region is healthy
   */
  isHealthy(regionId: string): boolean {
    const health = this.healthStatus.get(regionId);
    return health?.healthy || false;
  }

  /**
   * Get backup region for failed region
   */
  getBackupRegion(failedRegionId: string): string {
    const failedRegion = this.regions.get(failedRegionId);
    if (!failedRegion) return Array.from(this.regions.keys())[0];

    // Find nearest healthy region
    let minDistance = Infinity;
    let backupRegionId = '';

    for (const [regionId, region] of this.regions) {
      if (regionId === failedRegionId) continue;
      if (!this.isHealthy(regionId)) continue;

      const distance = this.calculateDistance(
        failedRegion.location,
        region.location
      );

      if (distance < minDistance) {
        minDistance = distance;
        backupRegionId = regionId;
      }
    }

    // If no healthy region found, use first available
    return backupRegionId || Array.from(this.regions.keys())[0];
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, HEALTH_CHECK_INTERVAL);

    // Perform initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks on all regions
   */
  private async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.regions.keys()).map((regionId) =>
      this.checkRegionHealth(regionId)
    );

    await Promise.allSettled(checks);
  }

  /**
   * Check health of specific region
   */
  private async checkRegionHealth(regionId: string): Promise<void> {
    const region = this.regions.get(regionId);
    if (!region) return;

    const health = this.healthStatus.get(regionId)!;
    const startTime = Date.now();

    try {
      // Perform health check
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

      const response = await fetch(`${region.endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const latency = Date.now() - startTime;
      const isHealthy = response.ok && latency < (region.maxLatencyMs || 1000);

      if (isHealthy) {
        health.healthy = true;
        health.latencyMs = latency;
        health.consecutiveFailures = 0;
      } else {
        health.consecutiveFailures++;
        if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          health.healthy = false;
        }
      }

      health.lastCheck = new Date();
    } catch (error) {
      health.consecutiveFailures++;
      if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        health.healthy = false;
      }
      health.lastCheck = new Date();
      console.error(`Health check failed for ${regionId}:`, error);
    }
  }

  /**
   * Get cache key for IP
   */
  private getCacheKey(ip: string): string {
    return createHash('md5').update(ip).digest('hex');
  }

  /**
   * Get all regions status
   */
  getRegionsStatus(): Array<{
    id: string;
    name: string;
    endpoint: string;
    healthy: boolean;
    latency: number;
    lastCheck: Date;
  }> {
    return Array.from(this.regions.entries()).map(([id, region]) => {
      const health = this.healthStatus.get(id)!;
      return {
        id,
        name: region.name,
        endpoint: region.endpoint,
        healthy: health.healthy,
        latency: health.latencyMs,
        lastCheck: health.lastCheck,
      };
    });
  }

  /**
   * Manually mark region as healthy/unhealthy
   */
  setRegionHealth(regionId: string, healthy: boolean): void {
    const health = this.healthStatus.get(regionId);
    if (health) {
      health.healthy = healthy;
      health.consecutiveFailures = healthy ? 0 : MAX_CONSECUTIVE_FAILURES;
    }
  }

  /**
   * Add or update region
   */
  addRegion(region: Region): void {
    this.regions.set(region.id, region);
    if (!this.healthStatus.has(region.id)) {
      this.healthStatus.set(region.id, {
        healthy: true,
        latencyMs: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0,
      });
    }
  }

  /**
   * Remove region
   */
  removeRegion(regionId: string): void {
    this.regions.delete(regionId);
    this.healthStatus.delete(regionId);
  }

  /**
   * Clear routing cache
   */
  clearCache(): void {
    this.routingCache.clear();
  }

  /**
   * Stop health checks
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }
}

// Export singleton instance
export const geoRouter = new GeoRouter();

// Export for testing
export default GeoRouter;
