import { logger } from '../utils/logger';
import { validateRequired, validateString, validateNumberRange } from '../utils/validators';
import { withRetry } from '../utils/retry';
import * as http from 'http';
import * as https from 'https';

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled: boolean;
  country?: string;
  city?: string;
  isp?: string;
}

/**
 * Proxy validation result
 */
export interface ProxyValidationResult {
  proxy: ProxyConfig;
  valid: boolean;
  responseTime?: number;
  ip?: string;
  country?: string;
  error?: string;
}

/**
 * Proxy rotation strategy
 */
export type RotationStrategy =
  | 'round-robin'
  | 'random'
  | 'least-used'
  | 'fastest';

/**
 * Proxy pool statistics
 */
export interface ProxyPoolStats {
  total: number;
  active: number;
  failed: number;
  avgResponseTime: number;
  byCountry: Record<string, number>;
  byType: Record<string, number>;
}

/**
 * Advanced Proxy Manager
 * Enterprise-grade proxy management with rotation and validation
 */
export class ProxyManager {
  private proxies: Map<string, ProxyConfig> = new Map();
  private proxyStats: Map<
    string,
    {
      uses: number;
      failures: number;
      lastUsed?: Date;
      responseTime?: number;
    }
  > = new Map();
  private currentIndex = 0;
  private rotationStrategy: RotationStrategy = 'round-robin';

  /**
   * Add proxy to pool
   */
  addProxy(proxy: ProxyConfig): void {
    validateRequired(proxy.host, 'Proxy host');
    validateRequired(proxy.port, 'Proxy port');
    validateNumberRange(proxy.port, 'Proxy port', 1, 65535);

    const key = this.getProxyKey(proxy);
    this.proxies.set(key, proxy);
    this.proxyStats.set(key, {
      uses: 0,
      failures: 0,
    });

    logger.info(`Added proxy: ${key}`);
  }

  /**
   * Add multiple proxies
   */
  addProxies(proxies: ProxyConfig[]): void {
    proxies.forEach((proxy) => this.addProxy(proxy));
  }

  /**
   * Remove proxy from pool
   */
  removeProxy(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    this.proxies.delete(key);
    this.proxyStats.delete(key);
    logger.info(`Removed proxy: ${key}`);
  }

  /**
   * Get next proxy based on rotation strategy
   */
  getNextProxy(): ProxyConfig | null {
    const activeProxies = this.getActiveProxies();

    if (activeProxies.length === 0) {
      logger.warn('No active proxies available');
      return null;
    }

    let proxy: ProxyConfig;

    switch (this.rotationStrategy) {
      case 'round-robin':
        proxy = this.getRoundRobinProxy(activeProxies);
        break;

      case 'random':
        proxy = this.getRandomProxy(activeProxies);
        break;

      case 'least-used':
        proxy = this.getLeastUsedProxy(activeProxies);
        break;

      case 'fastest':
        proxy = this.getFastestProxy(activeProxies);
        break;

      default:
        proxy = activeProxies[0];
    }

    // Update stats
    const key = this.getProxyKey(proxy);
    const stats = this.proxyStats.get(key)!;
    stats.uses++;
    stats.lastUsed = new Date();

    logger.debug(`Selected proxy: ${key} (strategy: ${this.rotationStrategy})`);
    return proxy;
  }

  /**
   * Get proxy by country
   */
  getProxyByCountry(country: string): ProxyConfig | null {
    const proxies = this.getActiveProxies().filter(
      (p) => p.country?.toLowerCase() === country.toLowerCase()
    );

    return proxies.length > 0 ? proxies[0] : null;
  }

  /**
   * Set rotation strategy
   */
  setRotationStrategy(strategy: RotationStrategy): void {
    this.rotationStrategy = strategy;
    logger.info(`Set rotation strategy: ${strategy}`);
  }

  /**
   * Validate proxy
   */
  async validateProxy(
    proxy: ProxyConfig,
    timeout = 10000
  ): Promise<ProxyValidationResult> {
    const key = this.getProxyKey(proxy);
    logger.debug(`Validating proxy: ${key}`);

    const startTime = Date.now();

    try {
      // Test connection through proxy
      const result = await this.testProxyConnection(proxy, timeout);

      const responseTime = Date.now() - startTime;

      // Update stats
      const stats = this.proxyStats.get(key);
      if (stats) {
        stats.responseTime = responseTime;
      }

      logger.info(`Proxy ${key} validated successfully (${responseTime}ms)`);

      return {
        proxy,
        valid: true,
        responseTime,
        ip: result.ip,
        country: result.country,
      };
    } catch (error) {
      logger.warn(`Proxy ${key} validation failed:`, error);

      // Update stats
      const stats = this.proxyStats.get(key);
      if (stats) {
        stats.failures++;
      }

      return {
        proxy,
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate all proxies in pool
   */
  async validateAllProxies(
    concurrency = 5,
    timeout = 10000
  ): Promise<ProxyValidationResult[]> {
    const proxies = Array.from(this.proxies.values());
    const results: ProxyValidationResult[] = [];

    logger.info(`Validating ${proxies.length} proxies...`);

    // Validate in batches
    for (let i = 0; i < proxies.length; i += concurrency) {
      const batch = proxies.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((proxy) => this.validateProxy(proxy, timeout))
      );
      results.push(...batchResults);
    }

    const validCount = results.filter((r) => r.valid).length;
    logger.info(`Validation complete: ${validCount}/${proxies.length} valid`);

    return results;
  }

  /**
   * Remove failed proxies
   */
  removeFailedProxies(maxFailures = 3): number {
    let removed = 0;

    for (const [key, stats] of this.proxyStats.entries()) {
      if (stats.failures >= maxFailures) {
        const proxy = Array.from(this.proxies.values()).find(
          (p) => this.getProxyKey(p) === key
        );

        if (proxy) {
          this.removeProxy(proxy);
          removed++;
        }
      }
    }

    if (removed > 0) {
      logger.info(`Removed ${removed} failed proxies`);
    }

    return removed;
  }

  /**
   * Get pool statistics
   */
  getStatistics(): ProxyPoolStats {
    const proxies = Array.from(this.proxies.values());
    const stats = Array.from(this.proxyStats.values());

    const active = proxies.filter((p) => p.enabled).length;
    const failed = stats.filter((s) => s.failures > 0).length;

    const responseTimes = stats
      .map((s) => s.responseTime)
      .filter((t): t is number => t !== undefined);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const byCountry = proxies.reduce((acc, p) => {
      const country = p.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = proxies.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: proxies.length,
      active,
      failed,
      avgResponseTime,
      byCountry,
      byType,
    };
  }

  /**
   * Get all proxies
   */
  getAllProxies(): ProxyConfig[] {
    return Array.from(this.proxies.values());
  }

  /**
   * Get active proxies only
   */
  getActiveProxies(): ProxyConfig[] {
    return Array.from(this.proxies.values()).filter((p) => p.enabled);
  }

  /**
   * Clear all proxies
   */
  clearProxies(): void {
    const count = this.proxies.size;
    this.proxies.clear();
    this.proxyStats.clear();
    this.currentIndex = 0;
    logger.info(`Cleared ${count} proxies`);
  }

  /**
   * Import proxies from text file (one per line)
   */
  importProxiesFromText(
    text: string,
    defaultType: ProxyConfig['type'] = 'http'
  ): number {
    const lines = text.split('\n').filter((line) => line.trim());
    let imported = 0;

    for (const line of lines) {
      try {
        const proxy = this.parseProxyString(line.trim(), defaultType);
        this.addProxy(proxy);
        imported++;
      } catch (error) {
        logger.warn(`Failed to parse proxy: ${line}`);
      }
    }

    logger.info(`Imported ${imported} proxies`);
    return imported;
  }

  /**
   * Export proxies to text format
   */
  exportProxiesToText(): string {
    return Array.from(this.proxies.values())
      .map((p) => this.formatProxyString(p))
      .join('\n');
  }

  /**
   * Private: Get proxy key
   */
  private getProxyKey(proxy: ProxyConfig): string {
    return `${proxy.type}://${proxy.host}:${proxy.port}`;
  }

  /**
   * Private: Get round-robin proxy
   */
  private getRoundRobinProxy(proxies: ProxyConfig[]): ProxyConfig {
    const proxy = proxies[this.currentIndex % proxies.length];
    this.currentIndex++;
    return proxy;
  }

  /**
   * Private: Get random proxy
   */
  private getRandomProxy(proxies: ProxyConfig[]): ProxyConfig {
    return proxies[Math.floor(Math.random() * proxies.length)];
  }

  /**
   * Private: Get least used proxy
   */
  private getLeastUsedProxy(proxies: ProxyConfig[]): ProxyConfig {
    return proxies.reduce((least, current) => {
      const leastStats = this.proxyStats.get(this.getProxyKey(least))!;
      const currentStats = this.proxyStats.get(this.getProxyKey(current))!;
      return currentStats.uses < leastStats.uses ? current : least;
    });
  }

  /**
   * Private: Get fastest proxy
   */
  private getFastestProxy(proxies: ProxyConfig[]): ProxyConfig {
    const proxiesWithResponseTime = proxies.filter((p) => {
      const stats = this.proxyStats.get(this.getProxyKey(p));
      return stats?.responseTime !== undefined;
    });

    if (proxiesWithResponseTime.length === 0) {
      return this.getRandomProxy(proxies);
    }

    return proxiesWithResponseTime.reduce((fastest, current) => {
      const fastestStats = this.proxyStats.get(this.getProxyKey(fastest))!;
      const currentStats = this.proxyStats.get(this.getProxyKey(current))!;
      return currentStats.responseTime! < fastestStats.responseTime!
        ? current
        : fastest;
    });
  }

  /**
   * Private: Test proxy connection
   */
  private async testProxyConnection(
    proxy: ProxyConfig,
    timeout: number
  ): Promise<{ ip?: string; country?: string }> {
    return new Promise((resolve, reject) => {
      const url = 'http://ip-api.com/json/';
      const options = {
        host: proxy.host,
        port: proxy.port,
        path: url,
        timeout,
      };

      const protocol = proxy.type === 'https' ? https : http;

      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              ip: result.query,
              country: result.country,
            });
          } catch (error) {
            resolve({});
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Proxy connection timeout'));
      });

      req.end();
    });
  }

  /**
   * Private: Parse proxy string
   * Formats:
   * - host:port
   * - type://host:port
   * - type://user:pass@host:port
   */
  private parseProxyString(
    str: string,
    defaultType: ProxyConfig['type']
  ): ProxyConfig {
    // Check if has protocol
    const hasProtocol = /^(http|https|socks4|socks5):\/\//.test(str);

    let type = defaultType;
    let rest = str;

    if (hasProtocol) {
      const [protocol, ...parts] = str.split('://');
      type = protocol as ProxyConfig['type'];
      rest = parts.join('://');
    }

    // Check for authentication
    let username: string | undefined;
    let password: string | undefined;

    if (rest.includes('@')) {
      const [auth, hostPort] = rest.split('@');
      [username, password] = auth.split(':');
      rest = hostPort;
    }

    // Parse host and port
    const [host, portStr] = rest.split(':');
    const port = parseInt(portStr, 10);

    if (!host || isNaN(port)) {
      throw new Error(`Invalid proxy format: ${str}`);
    }

    return {
      type,
      host,
      port,
      username,
      password,
      enabled: true,
    };
  }

  /**
   * Private: Format proxy to string
   */
  private formatProxyString(proxy: ProxyConfig): string {
    let str = `${proxy.type}://`;

    if (proxy.username && proxy.password) {
      str += `${proxy.username}:${proxy.password}@`;
    }

    str += `${proxy.host}:${proxy.port}`;
    return str;
  }
}

/**
 * Create proxy config from string
 */
export function createProxyFromString(str: string): ProxyConfig {
  const manager = new ProxyManager();
  return (manager as any).parseProxyString(str, 'http');
}

/**
 * Format proxy to string
 */
export function formatProxyToString(proxy: ProxyConfig): string {
  let str = `${proxy.type}://`;

  if (proxy.username && proxy.password) {
    str += `${proxy.username}:${proxy.password}@`;
  }

  str += `${proxy.host}:${proxy.port}`;
  return str;
}
