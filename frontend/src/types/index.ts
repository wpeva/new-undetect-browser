export interface BrowserProfile {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'stopped';
  fingerprint: Fingerprint;
  proxy?: ProxyConfig;
  cookies?: Cookie[];
  userAgent: string;
  createdAt: string;
  lastUsed?: string;
  tags: string[];
  notes?: string;
}

export interface Fingerprint {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  fonts: string[];
  timezone: string;
  locale: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  navigator: {
    platform: string;
    hardwareConcurrency: number;
    deviceMemory: number;
  };
}

export interface ProxyConfig {
  id: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  city?: string;
  latency?: number;
  status: 'active' | 'inactive' | 'checking' | 'working' | 'failed';
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface AutomationTask {
  id: string;
  name: string;
  profileId: string;
  script: string;
  schedule?: string;
  lastRun?: string;
  status: 'running' | 'scheduled' | 'paused' | 'failed';
}

export interface Statistics {
  totalProfiles: number;
  activeProfiles: number;
  totalProxies: number;
  successRate: number;
  todayUsage: number;
  weeklyUsage: number[];
}
