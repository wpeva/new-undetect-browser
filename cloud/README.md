# Cloud Infrastructure

This directory contains cloud infrastructure components for the Antidetect Browser, including multi-region deployment, geographic routing, and session migration.

## Directory Structure

```
cloud/
├── geo-router.ts              # Geographic routing engine
├── session-migration.ts       # Session migration manager
├── kernel/                    # Kernel-level modifications
├── vm/                        # Virtual machine management
├── __tests__/                 # Integration tests
│   ├── geo-router.test.ts
│   └── session-migration.test.ts
└── README.md                  # This file
```

---

## Components

### Geographic Router (`geo-router.ts`)

Intelligent routing system that directs client requests to the nearest healthy regional cluster.

**Features:**
- Distance-based routing using Haversine formula
- IP geolocation detection
- Latency-aware region selection
- Health monitoring (30s intervals)
- Intelligent caching (5-minute TTL)
- Automatic failover

**Usage:**

```typescript
import { geoRouter } from './geo-router';

// Route request
const result = await geoRouter.routeRequest('203.0.113.0');
console.log(result.region);    // 'us-east'
console.log(result.endpoint);  // 'https://us-east.api.antidetect.io'
console.log(result.distance);  // 1250 km
console.log(result.latency);   // 45 ms

// Check health
const healthy = geoRouter.isHealthy('us-east');

// Get backup region
const backup = geoRouter.getBackupRegion('us-east');
```

**API:**

```typescript
class GeoRouter {
  // Route request to optimal region
  routeRequest(clientIP: string, options?: RouteOptions): Promise<RouteResult>

  // Check region health
  isHealthy(regionId: string): boolean

  // Get backup region
  getBackupRegion(regionId: string): string

  // Get all regions status
  getRegionsStatus(): Array<RegionStatus>

  // Manage regions
  addRegion(region: Region): void
  removeRegion(regionId: string): void
  setRegionHealth(regionId: string, healthy: boolean): void

  // Cache management
  clearCache(): void

  // Lifecycle
  stop(): void
}
```

---

### Session Migration (`session-migration.ts`)

Manages seamless migration of browser sessions between regions with zero downtime.

**Features:**
- Zero-downtime migration
- Browser state preservation
- Automatic region evacuation
- Batch migration support
- Real-time sync across regions
- Event-driven architecture

**Usage:**

```typescript
import { sessionMigration } from './session-migration';

// Register session
sessionMigration.registerSession({
  id: 'session-123',
  userId: 'user-456',
  browserId: 'browser-789',
  region: 'us-east',
  // ... other fields
});

// Migrate single session
const result = await sessionMigration.migrateSession(
  'session-123',
  'eu-west'
);

// Batch migration
const results = await sessionMigration.batchMigrate(
  ['session-1', 'session-2', 'session-3'],
  'eu-west'
);

// Evacuate region
const evacuationResults = await sessionMigration.evacuateRegion('us-east');

// Query sessions
const session = sessionMigration.getSession('session-123');
const userSessions = sessionMigration.getSessionsByUser('user-456');
const regionSessions = sessionMigration.getSessionsByRegion('us-east');

// Statistics
const stats = sessionMigration.getStatistics();
```

**API:**

```typescript
class SessionMigration extends EventEmitter {
  // Session management
  registerSession(session: Session): void
  getSession(sessionId: string): Session | undefined
  getSessionsByUser(userId: string): Session[]
  getSessionsByRegion(region: string): Session[]
  terminateSession(sessionId: string): Promise<void>

  // Migration
  migrateSession(sessionId: string, targetRegion?: string, options?: MigrationOptions): Promise<MigrationResult>
  batchMigrate(sessionIds: string[], targetRegion?: string, options?: MigrationOptions): Promise<MigrationResult[]>
  evacuateRegion(sourceRegion: string): Promise<MigrationResult[]>

  // Statistics
  getStatistics(): MigrationStatistics

  // Lifecycle
  stop(): void
}
```

**Events:**

```typescript
// Session events
sessionMigration.on('session:registered', (session) => { });
sessionMigration.on('session:migrating', (event) => { });
sessionMigration.on('session:migrated', (event) => { });
sessionMigration.on('session:migration-failed', (event) => { });
sessionMigration.on('session:terminated', (event) => { });

// Region events
sessionMigration.on('region:evacuating', (event) => { });
sessionMigration.on('region:evacuated', (event) => { });
```

---

## Regions

### Supported Regions

| ID | Location | Coordinates | Endpoint |
|----|----------|-------------|----------|
| us-east | Virginia, USA | 37.5°N, 77.5°W | https://us-east.api.antidetect.io |
| eu-west | Ireland, EU | 53.3°N, 6.2°W | https://eu-west.api.antidetect.io |
| ap-south | Singapore, APAC | 1.3°N, 103.8°E | https://ap-south.api.antidetect.io |
| ru-central | Moscow, Russia | 55.7°N, 37.6°E | https://ru-central.api.antidetect.io |

### Adding New Regions

```typescript
geoRouter.addRegion({
  id: 'sa-east',
  name: 'South America East',
  endpoint: 'https://sa-east.api.antidetect.io',
  location: { lat: -23.5, lon: -46.6, country: 'BR' },
  weight: 100,
  maxLatencyMs: 200,
});
```

---

## Testing

### Run Tests

```bash
# All tests
npm test

# Specific test suite
npm test geo-router
npm test session-migration

# With coverage
npm test -- --coverage
```

### Test Coverage

- ✅ Geographic routing with various IPs
- ✅ Distance calculations
- ✅ Health monitoring
- ✅ Failover scenarios
- ✅ Session registration
- ✅ Single session migration
- ✅ Batch migration
- ✅ Region evacuation
- ✅ Session queries
- ✅ Statistics

---

## Configuration

### Environment Variables

```bash
# Geographic Router
GEO_HEALTH_CHECK_INTERVAL=30000    # 30 seconds
GEO_HEALTH_CHECK_TIMEOUT=5000      # 5 seconds
GEO_CACHE_TTL=300000               # 5 minutes
GEO_MAX_CONSECUTIVE_FAILURES=3

# Session Migration
MIGRATION_TIMEOUT=30000            # 30 seconds
MIGRATION_RETRIES=3
SNAPSHOT_INTERVAL=60000            # 1 minute
SESSION_SYNC_INTERVAL=5000         # 5 seconds
```

---

## Monitoring

### Health Checks

```typescript
// Check all regions
const regions = geoRouter.getRegionsStatus();
regions.forEach(region => {
  console.log(`${region.name}: ${region.healthy ? 'UP' : 'DOWN'} (${region.latency}ms)`);
});
```

### Migration Statistics

```typescript
const stats = sessionMigration.getStatistics();
console.log(`Total sessions: ${stats.totalSessions}`);
console.log(`By region:`, stats.sessionsByRegion);
console.log(`By state:`, stats.sessionsByState);
```

---

## Performance

### Expected Metrics

| Metric | Value |
|--------|-------|
| Routing decision | < 10ms (cached) |
| Routing decision | < 100ms (uncached) |
| Health check | < 5s |
| Session snapshot | 50-200ms |
| Session migration | 1-7s |
| Batch migration (100 sessions) | 10-30s |

---

## Architecture

### Geographic Routing Flow

```
Client Request
    ↓
Extract Client IP
    ↓
Geolocation Lookup
    ↓
Calculate Distances
    ↓
Score Regions (distance + latency + weight)
    ↓
Filter Unhealthy
    ↓
Select Best Region
    ↓
Cache Result
    ↓
Return Endpoint
```

### Session Migration Flow

```
Migration Request
    ↓
Validate Session
    ↓
Create Snapshot (cookies, storage, tabs, profile)
    ↓
Suspend Session
    ↓
Transfer to Target (shared storage)
    ↓
Restore in Target Region
    ↓
Activate Session
    ↓
Update Metadata
    ↓
Emit Success Event
```

---

## Integration

### Express.js Integration

```typescript
import express from 'express';
import { geoRouter } from './cloud/geo-router';

const app = express();

app.use(async (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const route = await geoRouter.routeRequest(clientIP);

  // Add routing info to request
  req.region = route.region;
  req.regionEndpoint = route.endpoint;

  next();
});
```

### WebSocket Integration

```typescript
import { Server } from 'socket.io';
import { sessionMigration } from './cloud/session-migration';

const io = new Server(server);

io.on('connection', (socket) => {
  // Register session
  sessionMigration.registerSession({
    id: socket.id,
    // ... session data
  });

  // Handle migration events
  sessionMigration.on('session:migrating', (event) => {
    if (event.sessionId === socket.id) {
      socket.emit('migrating', event);
    }
  });
});
```

---

## Best Practices

### Geographic Routing

1. **Cache aggressively** - Routing decisions are expensive
2. **Monitor health** - Keep health checks frequent but lightweight
3. **Use weights** - Adjust region weights based on capacity
4. **Fallback strategy** - Always have a backup region
5. **Prefer locality** - Keep sessions in the same region when possible

### Session Migration

1. **Minimize migrations** - Only migrate when necessary
2. **Batch operations** - Migrate multiple sessions together
3. **Preserve state** - Always capture complete browser state
4. **Handle failures** - Implement retry logic with exponential backoff
5. **Monitor metrics** - Track migration success rates and durations

---

## Troubleshooting

### Geographic Router Issues

**Problem:** All regions marked as unhealthy

```typescript
// Check network connectivity
const regions = geoRouter.getRegionsStatus();
regions.forEach(r => console.log(r.lastCheck, r.consecutiveFailures));

// Manually mark as healthy
geoRouter.setRegionHealth('us-east', true);
```

**Problem:** High routing latency

```typescript
// Clear cache
geoRouter.clearCache();

// Check geolocation service
// Consider caching geolocation results
```

### Session Migration Issues

**Problem:** Migration fails consistently

```typescript
// Check session state
const session = sessionMigration.getSession(sessionId);
console.log('State:', session?.state);

// Verify target region health
const healthy = geoRouter.isHealthy(targetRegion);

// Check logs for errors
sessionMigration.on('session:migration-failed', (event) => {
  console.error('Migration failed:', event.error);
});
```

---

## License

MIT License - See LICENSE file for details

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Create Pull Request

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/antidetect-browser/issues
- Documentation: See `/docs/MULTI_REGION_DEPLOYMENT.md`
- Tests: Run `npm test` to verify functionality
