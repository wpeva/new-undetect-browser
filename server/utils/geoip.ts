/**
 * GeoIP Utility
 * Determines geolocation information from IP address
 * Uses free APIs with fallback support
 */

import https from 'https';
import http from 'http';

export interface GeoIPResult {
  ip: string;
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  org?: string;
  success: boolean;
  error?: string;
}

// GeoIP API providers (free tier)
const GEOIP_PROVIDERS = [
  {
    name: 'ip-api.com',
    url: (ip: string) => `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,query`,
    parse: (data: any): GeoIPResult => ({
      ip: data.query,
      country: data.country,
      countryCode: data.countryCode,
      region: data.regionName,
      city: data.city,
      timezone: data.timezone,
      latitude: data.lat,
      longitude: data.lon,
      isp: data.isp,
      org: data.org,
      success: data.status === 'success',
      error: data.message,
    }),
    isHttps: false,
  },
  {
    name: 'ipapi.co',
    url: (ip: string) => `https://ipapi.co/${ip}/json/`,
    parse: (data: any): GeoIPResult => ({
      ip: data.ip,
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      timezone: data.timezone,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.org,
      org: data.org,
      success: !data.error,
      error: data.reason,
    }),
    isHttps: true,
  },
  {
    name: 'ipwhois.app',
    url: (ip: string) => `http://ipwhois.app/json/${ip}`,
    parse: (data: any): GeoIPResult => ({
      ip: data.ip,
      country: data.country,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      timezone: data.timezone,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.isp,
      org: data.org,
      success: data.success !== false,
      error: data.message,
    }),
    isHttps: false,
  },
];

// Cache for GeoIP results (5 minutes TTL)
const geoipCache = new Map<string, { result: GeoIPResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get geolocation info for an IP address
 */
export async function getGeoIP(ip: string): Promise<GeoIPResult> {
  // Check cache first
  const cached = geoipCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  // Try each provider with fallback
  for (const provider of GEOIP_PROVIDERS) {
    try {
      const result = await fetchGeoIP(provider, ip);
      if (result.success) {
        // Cache successful result
        geoipCache.set(ip, { result, timestamp: Date.now() });
        return result;
      }
    } catch (error) {
      console.error(`GeoIP provider ${provider.name} failed:`, error);
      // Continue to next provider
    }
  }

  // All providers failed
  return {
    ip,
    country: 'Unknown',
    countryCode: 'XX',
    success: false,
    error: 'All GeoIP providers failed',
  };
}

/**
 * Fetch GeoIP data from a specific provider
 */
function fetchGeoIP(
  provider: typeof GEOIP_PROVIDERS[0],
  ip: string
): Promise<GeoIPResult> {
  return new Promise((resolve, reject) => {
    const url = provider.url(ip);
    const httpModule = provider.isHttps ? https : http;

    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 10000);

    const req = httpModule.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UndetectBrowser/2.0)',
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
          const result = provider.parse(json);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response from ${provider.name}`));
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    req.on('timeout', () => {
      clearTimeout(timeout);
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Get geolocation through a proxy
 * Makes request to GeoIP service through the proxy to get proxy's IP location
 */
export async function getGeoIPThroughProxy(
  proxyHost: string,
  proxyPort: number,
  proxyType: 'http' | 'https' | 'socks4' | 'socks5' = 'http',
  proxyAuth?: { username: string; password: string }
): Promise<GeoIPResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        ip: '',
        country: 'Unknown',
        countryCode: 'XX',
        success: false,
        error: 'Timeout',
      });
    }, 15000);

    try {
      // Use ip-api.com through proxy
      const options: http.RequestOptions = {
        host: proxyHost,
        port: proxyPort,
        path: 'http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,query',
        method: 'GET',
        headers: {
          'Host': 'ip-api.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      };

      // Add proxy authentication
      if (proxyAuth) {
        const auth = Buffer.from(`${proxyAuth.username}:${proxyAuth.password}`).toString('base64');
        options.headers!['Proxy-Authorization'] = `Basic ${auth}`;
      }

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeout);
          try {
            const json = JSON.parse(data);
            if (json.status === 'success') {
              resolve({
                ip: json.query,
                country: json.country,
                countryCode: json.countryCode,
                region: json.regionName,
                city: json.city,
                timezone: json.timezone,
                latitude: json.lat,
                longitude: json.lon,
                isp: json.isp,
                success: true,
              });
            } else {
              resolve({
                ip: '',
                country: 'Unknown',
                countryCode: 'XX',
                success: false,
                error: json.message || 'GeoIP lookup failed',
              });
            }
          } catch (error) {
            resolve({
              ip: '',
              country: 'Unknown',
              countryCode: 'XX',
              success: false,
              error: 'Failed to parse GeoIP response',
            });
          }
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          ip: '',
          country: 'Unknown',
          countryCode: 'XX',
          success: false,
          error: err.message,
        });
      });

      req.on('timeout', () => {
        clearTimeout(timeout);
        req.destroy();
        resolve({
          ip: '',
          country: 'Unknown',
          countryCode: 'XX',
          success: false,
          error: 'Request timeout',
        });
      });

      req.end();
    } catch (error: any) {
      clearTimeout(timeout);
      resolve({
        ip: '',
        country: 'Unknown',
        countryCode: 'XX',
        success: false,
        error: error.message,
      });
    }
  });
}

/**
 * Get timezone for a country code
 */
export function getTimezoneForCountry(countryCode: string): string {
  const timezones: Record<string, string> = {
    US: 'America/New_York',
    GB: 'Europe/London',
    DE: 'Europe/Berlin',
    FR: 'Europe/Paris',
    ES: 'Europe/Madrid',
    IT: 'Europe/Rome',
    RU: 'Europe/Moscow',
    CN: 'Asia/Shanghai',
    JP: 'Asia/Tokyo',
    BR: 'America/Sao_Paulo',
    AU: 'Australia/Sydney',
    CA: 'America/Toronto',
    IN: 'Asia/Kolkata',
    KR: 'Asia/Seoul',
    MX: 'America/Mexico_City',
    NL: 'Europe/Amsterdam',
    PL: 'Europe/Warsaw',
    SE: 'Europe/Stockholm',
    CH: 'Europe/Zurich',
    AT: 'Europe/Vienna',
    BE: 'Europe/Brussels',
    PT: 'Europe/Lisbon',
    GR: 'Europe/Athens',
    CZ: 'Europe/Prague',
    DK: 'Europe/Copenhagen',
    FI: 'Europe/Helsinki',
    NO: 'Europe/Oslo',
    IE: 'Europe/Dublin',
    SG: 'Asia/Singapore',
    HK: 'Asia/Hong_Kong',
    TW: 'Asia/Taipei',
    TH: 'Asia/Bangkok',
    VN: 'Asia/Ho_Chi_Minh',
    ID: 'Asia/Jakarta',
    MY: 'Asia/Kuala_Lumpur',
    PH: 'Asia/Manila',
    NZ: 'Pacific/Auckland',
    ZA: 'Africa/Johannesburg',
    EG: 'Africa/Cairo',
    NG: 'Africa/Lagos',
    KE: 'Africa/Nairobi',
    AE: 'Asia/Dubai',
    SA: 'Asia/Riyadh',
    IL: 'Asia/Jerusalem',
    TR: 'Europe/Istanbul',
    UA: 'Europe/Kiev',
    AR: 'America/Buenos_Aires',
    CL: 'America/Santiago',
    CO: 'America/Bogota',
    PE: 'America/Lima',
    VE: 'America/Caracas',
  };

  return timezones[countryCode] || 'UTC';
}

/**
 * Get locale for a country code
 */
export function getLocaleForCountry(countryCode: string): string {
  const locales: Record<string, string> = {
    US: 'en-US',
    GB: 'en-GB',
    DE: 'de-DE',
    FR: 'fr-FR',
    ES: 'es-ES',
    IT: 'it-IT',
    RU: 'ru-RU',
    CN: 'zh-CN',
    JP: 'ja-JP',
    BR: 'pt-BR',
    AU: 'en-AU',
    CA: 'en-CA',
    IN: 'en-IN',
    KR: 'ko-KR',
    MX: 'es-MX',
    NL: 'nl-NL',
    PL: 'pl-PL',
    SE: 'sv-SE',
    CH: 'de-CH',
    AT: 'de-AT',
    BE: 'nl-BE',
    PT: 'pt-PT',
    GR: 'el-GR',
    CZ: 'cs-CZ',
    DK: 'da-DK',
    FI: 'fi-FI',
    NO: 'nb-NO',
    IE: 'en-IE',
    SG: 'en-SG',
    HK: 'zh-HK',
    TW: 'zh-TW',
    TH: 'th-TH',
    VN: 'vi-VN',
    ID: 'id-ID',
    MY: 'ms-MY',
    PH: 'en-PH',
    NZ: 'en-NZ',
    ZA: 'en-ZA',
    EG: 'ar-EG',
    NG: 'en-NG',
    KE: 'en-KE',
    AE: 'ar-AE',
    SA: 'ar-SA',
    IL: 'he-IL',
    TR: 'tr-TR',
    UA: 'uk-UA',
    AR: 'es-AR',
    CL: 'es-CL',
    CO: 'es-CO',
    PE: 'es-PE',
    VE: 'es-VE',
  };

  return locales[countryCode] || 'en-US';
}

/**
 * Get languages for a country code
 */
export function getLanguagesForCountry(countryCode: string): string[] {
  const languages: Record<string, string[]> = {
    US: ['en-US', 'en'],
    GB: ['en-GB', 'en'],
    DE: ['de-DE', 'de', 'en'],
    FR: ['fr-FR', 'fr', 'en'],
    ES: ['es-ES', 'es', 'en'],
    IT: ['it-IT', 'it', 'en'],
    RU: ['ru-RU', 'ru', 'en'],
    CN: ['zh-CN', 'zh'],
    JP: ['ja-JP', 'ja', 'en'],
    BR: ['pt-BR', 'pt', 'en'],
    AU: ['en-AU', 'en'],
    CA: ['en-CA', 'en', 'fr-CA'],
    IN: ['en-IN', 'hi', 'en'],
    KR: ['ko-KR', 'ko', 'en'],
  };

  return languages[countryCode] || ['en-US', 'en'];
}

/**
 * Clear GeoIP cache
 */
export function clearGeoIPCache(): void {
  geoipCache.clear();
}
