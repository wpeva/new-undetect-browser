# @anthropic/antidetect-sdk

Official JavaScript/TypeScript SDK for UndetectBrowser Anti-Detection Platform.

## Installation

```bash
npm install @anthropic/antidetect-sdk
# or
yarn add @anthropic/antidetect-sdk
# or
pnpm add @anthropic/antidetect-sdk
```

## Quick Start

```typescript
import { AntidetectClient } from '@anthropic/antidetect-sdk';

// Create client
const client = new AntidetectClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key' // optional
});

// Create a profile
const profile = await client.profiles.create({
  name: 'My Profile',
  os: 'windows',
  browser: 'chrome'
});

// Launch browser session
const session = await client.sessions.launch(profile.id, {
  headless: false
});

console.log('Browser launched!');
console.log('WebSocket endpoint:', session.wsEndpoint);
console.log('CDP endpoint:', session.cdpEndpoint);

// Get detection score
const score = await client.sessions.getDetectionScore(session.id);
console.log('Detection score:', score.score);

// Navigate to a page
await client.sessions.navigate(session.id, 'https://example.com');

// Take a screenshot
const screenshot = await client.sessions.screenshot(session.id);
console.log('Screenshot (base64):', screenshot.base64.substring(0, 100) + '...');

// Stop session when done
await client.sessions.stop(session.id);
```

## API Reference

### Client

```typescript
const client = new AntidetectClient({
  baseUrl: 'http://localhost:3000', // API server URL
  apiKey: 'your-api-key',           // Optional API key
  timeout: 30000,                   // Request timeout (ms)
  retries: 3                        // Number of retries
});
```

### Profiles

```typescript
// List all profiles
const profiles = await client.profiles.list({ page: 1, limit: 10 });

// Get a profile
const profile = await client.profiles.get('profile-id');

// Create a profile
const newProfile = await client.profiles.create({
  name: 'My Profile',
  os: 'windows',
  browser: 'chrome',
  proxy: {
    enabled: true,
    type: 'http',
    host: '192.168.1.1',
    port: 8080
  }
});

// Update a profile
await client.profiles.update('profile-id', { name: 'New Name' });

// Delete a profile
await client.profiles.delete('profile-id');

// Duplicate a profile
const duplicate = await client.profiles.duplicate('profile-id', 'Copy of Profile');

// Export/Import
const data = await client.profiles.export('profile-id');
const imported = await client.profiles.import(data);
```

### Sessions

```typescript
// Launch a browser session
const session = await client.sessions.launch('profile-id', {
  headless: false,
  args: ['--no-sandbox']
});

// Get session info
const info = await client.sessions.get('session-id');

// Get detection score
const score = await client.sessions.getDetectionScore('session-id');

// Navigate to URL
await client.sessions.navigate('session-id', 'https://example.com');

// Execute JavaScript
const result = await client.sessions.execute('session-id', 'return document.title');

// Take screenshot
const screenshot = await client.sessions.screenshot('session-id');

// Stop session
await client.sessions.stop('session-id');
```

### Proxies

```typescript
// List proxies
const proxies = await client.proxies.list();

// Add a proxy
const proxy = await client.proxies.create({
  name: 'My Proxy',
  type: 'http',
  host: '192.168.1.1',
  port: 8080,
  username: 'user',
  password: 'pass'
});

// Test proxy
const test = await client.proxies.test('proxy-id');
console.log('Latency:', test.latency, 'ms');

// Import proxies from text
const imported = await client.proxies.import(`
192.168.1.1:8080
192.168.1.2:8080:user:pass
`, 'ip:port:user:pass');
```

### Analytics

```typescript
// Get dashboard stats
const stats = await client.analytics.getDashboard();
console.log('Active sessions:', stats.activeSessions);
console.log('Average detection score:', stats.averageDetectionScore);

// Get detection history
const history = await client.analytics.getDetectionHistory({
  profileId: 'profile-id',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

### Real-time Updates

```typescript
// Create realtime client
const realtime = client.realtime();

// Connect
realtime.connect();

// Listen for events
realtime.on('connected', () => {
  console.log('Connected to server');
});

realtime.on('session:started', (data) => {
  console.log('Session started:', data.sessionId);
});

realtime.on('session:stopped', (data) => {
  console.log('Session stopped:', data.sessionId);
});

realtime.on('detection:score', (data) => {
  console.log('Detection score:', data.score);
});

// Subscribe to specific profile/session
realtime.subscribeToProfile('profile-id');
realtime.subscribeToSession('session-id');

// Disconnect when done
realtime.disconnect();
```

## Error Handling

```typescript
import {
  AntidetectError,
  AuthenticationError,
  NotFoundError,
  ValidationError
} from '@anthropic/antidetect-sdk';

try {
  await client.profiles.get('non-existent-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Profile not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof ValidationError) {
    console.log('Invalid request:', error.message);
  } else if (error instanceof AntidetectError) {
    console.log('API error:', error.message, error.code);
  }
}
```

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  Profile,
  Session,
  Proxy,
  CreateProfileOptions,
  LaunchOptions,
  DashboardStats
} from '@anthropic/antidetect-sdk';
```

## License

MIT
