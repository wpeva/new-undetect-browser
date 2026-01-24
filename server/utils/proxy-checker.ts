/**
 * Proxy Checker Utility
 * Real proxy validation with HTTP request, latency measurement, and IP detection
 */

import { SocksClient } from 'socks';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface ProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ProxyCheckResult {
  success: boolean;
  realIP?: string;
  latencyMs?: number;
  country?: string;
  city?: string;
  error?: string;
}

// Test URLs for proxy checking
const TEST_URLS = [
  'http://httpbin.org/ip',
  'http://ip-api.com/json',
  'http://api.ipify.org?format=json',
];

// Timeout for proxy check
const CHECK_TIMEOUT = 15000; // 15 seconds

/**
 * Check proxy by making HTTP request through it
 */
export async function checkProxy(proxy: ProxyConfig): Promise<ProxyCheckResult> {
  const startTime = Date.now();

  try {
    if (proxy.type === 'socks4' || proxy.type === 'socks5') {
      return await checkSocksProxy(proxy, startTime);
    } else {
      return await checkHttpProxy(proxy, startTime);
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Check HTTP/HTTPS proxy
 */
async function checkHttpProxy(proxy: ProxyConfig, startTime: number): Promise<ProxyCheckResult> {
  return new Promise((resolve) => {
    const testUrl = TEST_URLS[0];
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout' });
    }, CHECK_TIMEOUT);

    try {
      const proxyAuth = proxy.username && proxy.password
        ? `${proxy.username}:${proxy.password}@`
        : '';

      const proxyUrl = `http://${proxyAuth}${proxy.host}:${proxy.port}`;

      // Create HTTP request through proxy
      const options: http.RequestOptions = {
        host: proxy.host,
        port: proxy.port,
        path: testUrl,
        method: 'GET',
        headers: {
          'Host': new URL(testUrl).host,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: CHECK_TIMEOUT,
      };

      // Add proxy authentication
      if (proxy.username && proxy.password) {
        const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64');
        options.headers!['Proxy-Authorization'] = `Basic ${auth}`;
      }

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeout);
          const latencyMs = Date.now() - startTime;

          try {
            const json = JSON.parse(data);
            const realIP = json.origin || json.ip || json.query;

            resolve({
              success: true,
              realIP,
              latencyMs,
              country: json.country || json.countryCode,
              city: json.city,
            });
          } catch {
            // Try to extract IP from plain text response
            const ipMatch = data.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
            resolve({
              success: true,
              realIP: ipMatch ? ipMatch[0] : undefined,
              latencyMs,
            });
          }
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        clearTimeout(timeout);
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.end();
    } catch (error: any) {
      clearTimeout(timeout);
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Check SOCKS proxy
 */
async function checkSocksProxy(proxy: ProxyConfig, startTime: number): Promise<ProxyCheckResult> {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout' });
    }, CHECK_TIMEOUT);

    try {
      const targetUrl = new URL(TEST_URLS[1]); // ip-api.com works well for SOCKS

      // Connect through SOCKS proxy
      const info = await SocksClient.createConnection({
        proxy: {
          host: proxy.host,
          port: proxy.port,
          type: proxy.type === 'socks5' ? 5 : 4,
          userId: proxy.username,
          password: proxy.password,
        },
        command: 'connect',
        destination: {
          host: targetUrl.hostname,
          port: 80,
        },
        timeout: CHECK_TIMEOUT,
      });

      // Make HTTP request through the SOCKS connection
      const httpRequest = `GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1\r\nHost: ${targetUrl.hostname}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`;

      info.socket.write(httpRequest);

      let data = '';
      info.socket.on('data', (chunk) => {
        data += chunk.toString();
      });

      info.socket.on('end', () => {
        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;

        try {
          // Parse HTTP response body
          const bodyStart = data.indexOf('\r\n\r\n');
          if (bodyStart !== -1) {
            const body = data.slice(bodyStart + 4);
            const json = JSON.parse(body);

            resolve({
              success: true,
              realIP: json.query || json.ip,
              latencyMs,
              country: json.countryCode || json.country,
              city: json.city,
            });
          } else {
            resolve({
              success: true,
              latencyMs,
            });
          }
        } catch {
          resolve({
            success: true,
            latencyMs,
          });
        }
      });

      info.socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });

    } catch (error: any) {
      clearTimeout(timeout);
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Check multiple proxies in parallel
 */
export async function checkProxies(
  proxies: ProxyConfig[],
  concurrency: number = 10
): Promise<Map<string, ProxyCheckResult>> {
  const results = new Map<string, ProxyCheckResult>();

  // Process in batches
  for (let i = 0; i < proxies.length; i += concurrency) {
    const batch = proxies.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (proxy) => {
        const key = `${proxy.host}:${proxy.port}`;
        const result = await checkProxy(proxy);
        return { key, result };
      })
    );

    batchResults.forEach(({ key, result }) => {
      results.set(key, result);
    });
  }

  return results;
}
