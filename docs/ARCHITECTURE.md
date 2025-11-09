# UndetectBrowser Architecture

## 📐 Overview

UndetectBrowser is designed as a modular, extensible framework for anti-detection browser automation. The architecture follows clean code principles with clear separation of concerns.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Application                       │
└─────────────────────────────┬───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│              UndetectBrowser (Main API)                  │
│  • launch()   • close()   • Configuration                │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
      ┌─────────▼──────────┐    ┌────────▼────────┐
      │  StealthEngine     │    │ ProfileManager   │
      │  • Apply modules   │    │ • Create profiles│
      │  • Orchestrate     │    │ • Store profiles │
      └─────────┬──────────┘    └────────┬────────┘
                │                        │
      ┌─────────▼────────────────────────▼────────┐
      │         Protection Modules                 │
      │  ┌──────────────┐  ┌───────────────────┐  │
      │  │  Fingerprint │  │    Network        │  │
      │  │   Spoofing   │  │   Protection      │  │
      │  └──────────────┘  └───────────────────┘  │
      │  ┌──────────────┐  ┌───────────────────┐  │
      │  │   Viewport   │  │    WebDriver      │  │
      │  │  Protection  │  │    Evasion        │  │
      │  └──────────────┘  └───────────────────┘  │
      └────────────────────────┬──────────────────┘
                               │
      ┌────────────────────────▼──────────────────┐
      │          Utility Layer                     │
      │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │
      │  │  Logger  │ │ Validators│ │   Retry   │ │
      │  └──────────┘ └──────────┘ └───────────┘ │
      │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │
      │  │Memoization│ │Performance│ │  Storage  │ │
      │  └──────────┘ └──────────┘ └───────────┘ │
      └────────────────────────┬──────────────────┘
                               │
      ┌────────────────────────▼──────────────────┐
      │              Puppeteer                     │
      │         (Browser Automation)               │
      └────────────────────────────────────────────┘
```

## 📦 Module Details

### 1. Core Layer

#### UndetectBrowser (Main Entry Point)

```typescript
class UndetectBrowser {
  private stealthEngine: StealthEngine;
  private profileManager: ProfileManager;
  
  async launch(options: LaunchOptions): Promise<UndetectBrowserInstance>;
  async createProfile(options: ProfileOptions): Promise<BrowserProfile>;
  async loadProfile(id: string): Promise<BrowserProfile | null>;
}
```

**Responsibilities:**
- Public API surface
- Configuration management
- Component orchestration
- Lifecycle management

#### StealthEngine

```typescript
class StealthEngine {
  private modules: Map<string, ProtectionModule>;
  
  async applyToPage(page: Page, profile: BrowserProfile): Promise<void>;
  registerModule(name: string, module: ProtectionModule): void;
  enableModule(name: string): void;
  disableModule(name: string): void;
}
```

**Responsibilities:**
- Module registration and management
- Protection application orchestration
- Configuration-based module activation
- Page instrumentation coordination

#### ProfileManager

```typescript
class ProfileManager {
  async createProfile(options?: ProfileOptions): Promise<BrowserProfile>;
  async loadProfile(id: string): Promise<BrowserProfile | null>;
  async saveProfile(profile: BrowserProfile): Promise<void>;
  async listProfiles(): Promise<string[]>;
  async deleteProfile(id: string): Promise<void>;
}
```

**Responsibilities:**
- Profile generation with realistic fingerprints
- Profile persistence and retrieval
- Profile lifecycle management
- Fingerprint consistency

### 2. Protection Modules

Each protection module follows the same interface:

```typescript
interface ProtectionModule {
  inject(page: Page, profile: BrowserProfile): Promise<void>;
  getName(): string;
  isEnabled(): boolean;
}
```

#### FingerprintSpoofingModule

Protects against fingerprinting techniques:

**Canvas Protection:**
- Injects imperceptible noise into canvas data
- Randomizes per session while maintaining consistency
- Overrides `toDataURL`, `toBlob`, and `getImageData`

**WebGL Protection:**
- Randomizes vendor and renderer strings
- Adds noise to getParameter results
- Spoofs WEBGL_debug_renderer_info

**Audio Protection:**
- Adds imperceptible variations to audio output
- Modifies AudioContext frequency data
- Prevents audio fingerprinting

**Font Protection:**
- Controls font enumeration
- Randomizes font metrics
- Prevents font-based fingerprinting

**Implementation:**
```typescript
class FingerprintSpoofingModule {
  constructor(private profile: FingerprintProfile) {}
  
  async inject(page: Page): Promise<void> {
    await page.evaluateOnNewDocument((profile) => {
      // Canvas noise injection
      this.protectCanvas(profile.canvas);
      
      // WebGL protection
      this.protectWebGL(profile.webgl);
      
      // Audio protection
      this.protectAudio(profile.audio);
      
      // Font protection
      this.protectFonts(profile.fonts);
    }, this.profile);
  }
}
```

#### NetworkProtectionModule

Manages network-level protection:

```typescript
class NetworkProtectionModule {
  async inject(page: Page): Promise<void> {
    // Set realistic headers
    await this.setHeaders(page);
    
    // Intercept and modify requests
    await this.setupRequestInterception(page);
    
    // Manage cookies
    await this.setupCookieHandling(page);
    
    // Handle referer chain
    await this.setupRefererChain(page);
  }
}
```

**Features:**
- HTTP header management (Sec-Fetch-*, Accept-Language, etc.)
- Request interception and modification
- Cookie handling and persistence
- Referer chain management
- Proxy support

#### ViewportProtectionModule

Ensures consistent viewport and screen properties:

```typescript
class ViewportProtectionModule {
  constructor(private profile: ViewportProfile) {}
  
  async inject(page: Page): Promise<void> {
    await page.evaluateOnNewDocument((profile) => {
      // Override window dimensions
      Object.defineProperty(window, 'innerWidth', {
        get: () => profile.width,
      });
      
      // Override screen properties
      Object.defineProperty(screen, 'width', {
        get: () => profile.width,
      });
      
      // Synchronize all viewport APIs
      this.synchronizeViewportAPIs(profile);
    }, this.profile);
  }
}
```

**Protected APIs:**
- `window.innerWidth/innerHeight`
- `window.outerWidth/outerHeight`
- `screen.width/height`
- `screen.availWidth/availHeight`
- Visual Viewport API
- ResizeObserver

#### AdvancedEvasionsModule

Additional stealth techniques:

```typescript
class AdvancedEvasionsModule {
  async inject(page: Page): Promise<void> {
    // Remove automation APIs
    await this.removeAutomationAPIs(page);
    
    // Protect timing APIs
    await this.protectTimingAPIs(page);
    
    // Prevent WebRTC leaks
    await this.preventWebRTCLeaks(page);
    
    // Sanitize error stacks
    await this.sanitizeErrorStacks(page);
  }
}
```

**Features:**
- USB/Bluetooth/Sensor API removal
- Performance API timing protection
- WebRTC IP leak prevention
- Error stack sanitization
- Storage quota normalization
- Touch event emulation

### 3. Utility Layer

#### Logger

Structured logging with multiple handlers:

```typescript
class Logger {
  private handlers: LogHandler[] = [];
  private context: Record<string, unknown> = {};
  
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error | Record<string, unknown>): void;
  
  addHandler(handler: LogHandler): void;
  setContext(context: Record<string, unknown>): void;
  child(prefix: string, context?: Record<string, unknown>): Logger;
  
  async measureTime<T>(label: string, fn: () => Promise<T> | T): Promise<T>;
}
```

**Features:**
- Multiple log handlers (console, file, JSON, buffer)
- Contextual logging
- Child loggers with inherited context
- Performance measurement
- Log filtering by level

#### Memoization

Performance optimization utilities:

```typescript
// Simple memoization
function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R;

// Async memoization with deduplication
function memoizeAsync<T, R>(fn: (arg: T) => Promise<R>): (arg: T) => Promise<R>;

// Custom key generator
function memoizeWithKey<Args extends any[], R>(
  fn: (...args: Args) => R,
  keyGen: (...args: Args) => string
): (...args: Args) => R;

// LRU Cache with TTL
class LRUCache<K, V> {
  constructor(maxSize: number, ttl: number);
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  getStats(): CacheStats;
}

// Resource pooling
class ResourcePool<T> {
  constructor(
    factory: () => T | Promise<T>,
    destroyer: (resource: T) => void | Promise<void>,
    maxSize: number
  );
  async acquire(): Promise<T>;
  release(resource: T): void;
  async disposeAll(): Promise<void>;
}

// Batch processing
class BatchProcessor<T, R> {
  constructor(
    processor: (items: T[]) => Promise<R[]>,
    maxBatchSize: number,
    maxWaitMs: number
  );
  async add(item: T): Promise<R>;
}
```

**Use Cases:**
- Cache expensive computations
- Prevent duplicate async operations
- Pool browser pages/connections
- Batch API calls
- Reduce overhead

#### Performance

Monitoring and benchmarking:

```typescript
class PerformanceMonitor {
  constructor(maxMetrics: number = 1000);
  
  startTimer(name: string): void;
  endTimer(name: string, metadata?: Record<string, unknown>): PerformanceMetric;
  
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T>;
  
  getMetrics(name?: string): PerformanceMetric[];
  getStats(name: string): PerformanceStats | null;
  clearMetrics(): void;
  logSummary(): void;
}

// Benchmark function
async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  options?: BenchmarkOptions
): Promise<BenchmarkResult>;

// Compare benchmarks
async function compareBenchmarks(
  benchmarks: Array<{ name: string; fn: () => void | Promise<void> }>,
  options?: BenchmarkOptions
): Promise<void>;

// Memory profiling
class MemoryProfiler {
  snapshot(label: string): void;
  diff(fromLabel: string, toLabel: string): MemoryDiff | null;
  getSnapshots(): MemorySnapshot[];
  clear(): void;
  logSummary(): void;
}
```

**Features:**
- Operation timing
- Statistics calculation (avg, min, max, p50, p95, p99)
- Benchmarking with warmup
- Memory profiling
- Performance tracking

#### Validators

Input validation utilities:

```typescript
function validateRequired<T>(value: T, fieldName: string): asserts value is T;
function validateString(value: unknown, fieldName: string): asserts value is string;
function validateNumber(value: unknown, fieldName: string): asserts value is number;
function validateNumberRange(value: number, fieldName: string, min: number, max: number): void;
function validateArray<T>(value: unknown, fieldName: string): asserts value is T[];
function validateViewportDimensions(width: number, height: number): void;
function validateDeviceMemory(memory: number): void;
function validateTimezone(timezone: string): void;
function validateGeolocation(lat: number, lon: number): void;
```

**Features:**
- Type assertion validation
- Range validation
- Format validation
- Domain-specific validation (viewport, timezone, etc.)
- Helpful error messages

#### Retry

Retry logic with exponential backoff:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T>;

async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T>;

async function withNavigationRetry(
  page: Page,
  url: string,
  options?: NavigateOptions & Partial<RetryOptions>
): Promise<void>;

class CircuitBreaker {
  constructor(failureThreshold: number, resetTimeoutMs: number);
  async execute<T>(fn: () => Promise<T>): Promise<T>;
  reset(): void;
  getState(): 'closed' | 'open' | 'half-open';
  getFailures(): number;
}
```

**Features:**
- Configurable retry attempts
- Exponential backoff
- Custom retry conditions
- Circuit breaker pattern
- Network-specific retry logic
- Navigation retry with timeout

### 4. Storage Layer

#### ProfileStorage

Persistent profile storage:

```typescript
class ProfileStorage {
  constructor(config: StorageConfig);
  
  async initialize(): Promise<void>;
  async saveProfile(profile: BrowserProfile): Promise<void>;
  async loadProfile(id: string): Promise<BrowserProfile | null>;
  async deleteProfile(id: string): Promise<void>;
  async listProfiles(): Promise<string[]>;
  async profileExists(id: string): Promise<boolean>;
}
```

**Features:**
- File-based storage
- JSON serialization
- Optional encryption
- Profile indexing
- Atomic operations

## 🔄 Data Flow

### 1. Browser Launch Flow

```
User calls launch()
    ↓
UndetectBrowser.launch()
    ↓
ProfileManager.createProfile() or loadProfile()
    ↓
Puppeteer.launch() with args
    ↓
StealthEngine.applyToPage()
    ↓
For each enabled module:
    module.inject(page, profile)
    ↓
    Inject protection scripts
    ↓
    Override browser APIs
    ↓
Return UndetectBrowserInstance
```

### 2. Page Navigation Flow

```
User calls page.goto()
    ↓
Request Interception (if enabled)
    ↓
Modify Headers
    ↓
Apply Network Protection
    ↓
Load Page
    ↓
Protection Scripts Execute
    ↓
APIs Overridden
    ↓
Page Ready
```

### 3. Profile Creation Flow

```
ProfileManager.createProfile(options)
    ↓
Generate User Agent
    ↓
Generate Viewport
    ↓
Generate Fingerprints
    │
    ├─ Canvas (noise levels)
    ├─ WebGL (vendor/renderer)
    ├─ Audio (frequency variations)
    └─ Fonts (available fonts)
    ↓
Generate Navigator Props
    │
    ├─ Platform
    ├─ Language
    ├─ Hardware Concurrency
    └─ Device Memory
    ↓
Generate Geolocation (optional)
    ↓
Save Profile (if persistence enabled)
    ↓
Return BrowserProfile
```

## 🧩 Extension Points

### Custom Protection Modules

Create custom protection modules:

```typescript
class CustomProtectionModule implements ProtectionModule {
  getName(): string {
    return 'custom-protection';
  }
  
  isEnabled(): boolean {
    return true;
  }
  
  async inject(page: Page, profile: BrowserProfile): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // Your custom protection code
    });
  }
}

// Register module
const undetect = new UndetectBrowser();
undetect.stealthEngine.registerModule('custom', new CustomProtectionModule());
```

### Custom Log Handlers

Create custom log handlers:

```typescript
const customHandler: LogHandler = (entry: LogEntry) => {
  // Send to external service
  sendToElasticsearch(entry);
};

logger.addHandler(customHandler);
```

### Custom Validators

Add domain-specific validators:

```typescript
function validateCustomFormat(value: string, fieldName: string): void {
  if (!CUSTOM_REGEX.test(value)) {
    throw new ValidationError(`Invalid ${fieldName}: must match custom format`);
  }
}
```

## 📊 Performance Considerations

### Memory Management

- **LRU Cache**: Automatic eviction when full
- **Resource Pool**: Reuse instead of create
- **Batch Processing**: Reduce overhead
- **TTL**: Automatic expiration of cached data

### Optimization Strategies

1. **Memoization**: Cache expensive function results
2. **Pooling**: Reuse browser pages and connections
3. **Batching**: Combine multiple operations
4. **Lazy Loading**: Defer initialization until needed
5. **Throttling**: Limit execution rate

### Scalability

- **Horizontal**: Multiple browser instances
- **Vertical**: Page pooling within instance
- **Caching**: Reduce redundant operations
- **Async**: Non-blocking operations
- **Parallel**: Concurrent execution

## 🔐 Security Considerations

### Input Validation

All user inputs are validated:
- Profile options
- Launch options
- URLs
- Custom configurations

### Error Handling

- Custom error classes with codes
- Graceful degradation
- Detailed error messages
- Stack trace sanitization

### Resource Cleanup

- Automatic browser/page cleanup
- Resource pool disposal
- Timer clearance
- Event listener removal

## 🧪 Testing Strategy

### Unit Tests

- Individual utility functions
- Isolated module logic
- Edge cases and error conditions
- Performance characteristics

### Integration Tests

- Module interactions
- Full stealth engine
- Real browser automation
- Detection bypass validation

### Performance Tests

- Benchmark critical paths
- Memory leak detection
- Resource usage monitoring
- Scalability testing

## 📈 Monitoring & Observability

### Metrics

- Operation timing
- Cache hit rates
- Resource pool utilization
- Error rates
- Memory usage

### Logging

- Structured logs with context
- Multiple log levels
- Contextual child loggers
- Performance measurements

### Profiling

- Memory snapshots
- Performance benchmarks
- Operation statistics
- Percentile calculations

## 🔮 Future Enhancements

### Planned Features

1. **Plugin System**: Dynamic module loading
2. **Cloud Support**: Remote browser instances
3. **Multi-Browser**: Firefox, Safari support
4. **ML-Based Evasion**: Adaptive protection
5. **Distributed Scraping**: Cluster support

### Architecture Evolution

- Microservices architecture for scaling
- Event-driven module communication
- Plugin marketplace
- REST API server mode
- GraphQL API for monitoring

---

<div align="center">

**Architecture designed for maintainability, extensibility, and performance**

</div>
