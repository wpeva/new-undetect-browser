# Cloud Anti-Detect Browser Infrastructure

Complete cloud deployment infrastructure for the Anti-Detect Browser with Docker orchestration, load balancing, session management, and scalability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     NGINX Load Balancer                      │
│              (Rate Limiting, WebSocket Support)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Browser  │    │ Browser  │... │ Browser  │
│  Pool 1  │    │  Pool 2  │    │  Pool N  │
│          │    │          │    │          │
│ Chromium │    │ Chromium │    │ Chromium │
│   CDP    │    │   CDP    │    │   CDP    │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
     ▼                               ▼
┌─────────┐                    ┌──────────┐
│  Redis  │                    │PostgreSQL│
│(Session)│                    │(Profiles)│
└─────────┘                    └──────────┘
```

## Features

- **Scalable Architecture**: Scale to 100+ concurrent browser sessions
- **Load Balancing**: NGINX with least_conn algorithm
- **Session Management**: Redis-backed session state with automatic cleanup
- **Profile Storage**: PostgreSQL for persistent fingerprint profiles
- **Health Monitoring**: Built-in health checks and metrics (Prometheus format)
- **WebSocket Support**: Real-time CDP access for each browser
- **Rate Limiting**: Protects API from abuse (configurable per endpoint)
- **Auto-Recovery**: Unhealthy sessions detected and recycled automatically
- **Resource Limits**: Per-container CPU and memory limits

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM available
- Linux host (recommended) or macOS/Windows with WSL2

### 1. Build and Start

```bash
# Build the Docker image
docker compose -f docker-compose.cloud.yml build

# Start all services
docker compose -f docker-compose.cloud.yml up -d

# Scale browser pool to 5 instances
docker compose -f docker-compose.cloud.yml up -d --scale browser-pool=5

# Check status
docker compose -f docker-compose.cloud.yml ps
```

### 2. Verify Health

```bash
# Health check
curl http://localhost/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 123.45,
#   "sessions": { "active": 0, "max": 100 },
#   "memory": { ... },
#   "timestamp": "2025-11-13T..."
# }
```

### 3. Create Your First Session

```bash
# Create a session
curl -X POST http://localhost/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": {
      "platform": "Win32",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    "stealthLevel": "advanced",
    "headless": true
  }'

# Response:
# {
#   "success": true,
#   "session": {
#     "id": "session_1699999999_abc123",
#     "cdpUrl": "ws://localhost:9222",
#     "wsUrl": "ws://localhost:9222",
#     "createdAt": "2025-11-13T...",
#     "pagesCount": 1,
#     "config": { ... }
#   }
# }
```

## API Reference

### Session Management

#### Create Session
```http
POST /api/sessions/create
Content-Type: application/json

{
  "fingerprint": {
    "platform": "Win32",
    "userAgent": "Mozilla/5.0..."
  },
  "stealthLevel": "basic" | "moderate" | "advanced" | "paranoid",
  "headless": true,
  "viewport": { "width": 1920, "height": 1080 },
  "proxy": "http://proxy.example.com:8080",
  "timeout": 1800000
}
```

#### Get Session Info
```http
GET /api/sessions/:sessionId
```

#### List All Sessions
```http
GET /api/sessions
```

#### Destroy Session
```http
DELETE /api/sessions/:sessionId
```

#### Navigate Page
```http
POST /api/sessions/:sessionId/navigate
Content-Type: application/json

{
  "url": "https://example.com",
  "pageIndex": 0
}
```

#### Execute JavaScript
```http
POST /api/sessions/:sessionId/execute
Content-Type: application/json

{
  "code": "document.title",
  "pageIndex": 0
}
```

#### Take Screenshot
```http
POST /api/sessions/:sessionId/screenshot
Content-Type: application/json

{
  "pageIndex": 0,
  "fullPage": false
}
```

### Health & Metrics

#### Health Check
```http
GET /health
```

#### Prometheus Metrics
```http
GET /metrics
```

#### NGINX Status
```http
GET /status
```

## Configuration

### Environment Variables

#### Browser Pool Container

```env
# Node.js
NODE_ENV=production
PORT=3000

# Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Session Management
MAX_SESSIONS=100
SESSION_TIMEOUT=1800000  # 30 minutes in ms

# Database
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://antidetect:password@postgres:5432/antidetect

# Display (Xvfb)
DISPLAY=:99
```

#### PostgreSQL

```env
POSTGRES_USER=antidetect
POSTGRES_PASSWORD=password
POSTGRES_DB=antidetect
```

#### Redis

```env
REDIS_PASSWORD=optional-password
```

### Scaling

```bash
# Scale browser pool to 10 instances
docker compose -f docker-compose.cloud.yml up -d --scale browser-pool=10

# Each instance can handle up to MAX_SESSIONS sessions
# Total capacity = instances * MAX_SESSIONS
```

### Resource Limits

Adjust in `docker-compose.cloud.yml`:

```yaml
services:
  browser-pool:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Advanced Usage

### Custom Fingerprints

```javascript
// Create session with custom fingerprint
const response = await fetch('http://localhost/api/sessions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fingerprint: {
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      screen: {
        width: 2560,
        height: 1440,
        availWidth: 2560,
        availHeight: 1415,
        colorDepth: 30,
        pixelDepth: 30
      },
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      webgl: {
        vendor: 'Apple Inc.',
        renderer: 'Apple M2'
      }
    },
    stealthLevel: 'paranoid',
    headless: false
  })
});

const { session } = await response.json();
console.log('Session created:', session.id);
```

### Using CDP (Chrome DevTools Protocol)

```javascript
const puppeteer = require('puppeteer-core');

// Connect to existing session via CDP
const browser = await puppeteer.connect({
  browserWSEndpoint: session.cdpUrl
});

const page = await browser.newPage();
await page.goto('https://example.com');
const title = await page.title();
console.log('Page title:', title);
```

### Profile Management

```javascript
// Store frequently-used profiles in PostgreSQL
// Profiles are automatically created by the init.sql script

// Use a profile
const response = await fetch('http://localhost/api/sessions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profileId: 'profile_sample_1',
    stealthLevel: 'advanced'
  })
});
```

### WebSocket Integration

```javascript
const WebSocket = require('ws');

// Connect to session WebSocket for real-time events
const ws = new WebSocket('ws://localhost/ws/');

ws.on('open', () => {
  console.log('WebSocket connected');
  ws.send(JSON.stringify({ action: 'subscribe', sessionId: session.id }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});
```

## Monitoring

### Prometheus + Grafana (Optional)

Uncomment monitoring services in `docker-compose.cloud.yml`:

```yaml
  prometheus:
    # ... configuration ...

  grafana:
    # ... configuration ...
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### Metrics Available

```
browser_sessions_active          - Number of active sessions
browser_sessions_max             - Maximum session capacity
nodejs_memory_heap_used_bytes    - Node.js heap memory used
nodejs_memory_heap_total_bytes   - Node.js heap memory total
process_uptime_seconds           - Process uptime
```

## Troubleshooting

### Sessions not starting

```bash
# Check browser pool logs
docker compose -f docker-compose.cloud.yml logs browser-pool

# Common issues:
# - Out of memory: Increase memory limits or reduce MAX_SESSIONS
# - Chromium crash: Check Xvfb is running correctly
```

### High memory usage

```bash
# Monitor memory per container
docker stats

# Solutions:
# - Reduce MAX_SESSIONS
# - Decrease SESSION_TIMEOUT for faster cleanup
# - Enable healthCheckInterval for aggressive cleanup
```

### Connection refused

```bash
# Check all services are running
docker compose -f docker-compose.cloud.yml ps

# Restart services
docker compose -f docker-compose.cloud.yml restart
```

### Database connection errors

```bash
# Check PostgreSQL logs
docker compose -f docker-compose.cloud.yml logs postgres

# Reinitialize database
docker compose -f docker-compose.cloud.yml down -v
docker compose -f docker-compose.cloud.yml up -d
```

## Security Considerations

### Production Deployment

1. **Change default passwords** in `docker-compose.cloud.yml`
2. **Enable HTTPS** in `nginx.conf` (uncomment HTTPS server block)
3. **Restrict /metrics and /status** endpoints to internal network only
4. **Use firewall rules** to limit access to CDP ports (9222-9322)
5. **Enable authentication** for API endpoints
6. **Use secrets management** (Docker Swarm secrets, Kubernetes secrets)

### Network Security

```yaml
# Example: Restrict internal network
networks:
  antidetect-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

## Performance Tuning

### NGINX

```nginx
# Increase worker connections
worker_connections 4096;

# Tune keepalive
keepalive_timeout 65;
keepalive_requests 100;

# Buffer sizes
client_max_body_size 100M;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
```

### Redis

```env
# Increase max memory
REDIS_MAXMEMORY=2gb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

### PostgreSQL

```env
# Tune for performance
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
POSTGRES_MAX_CONNECTIONS=100
```

## Logs

### View logs

```bash
# All services
docker compose -f docker-compose.cloud.yml logs -f

# Specific service
docker compose -f docker-compose.cloud.yml logs -f browser-pool

# Last 100 lines
docker compose -f docker-compose.cloud.yml logs --tail=100
```

### Log rotation

Configure in Docker daemon or use external log aggregation (ELK, Loki, etc.)

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
docker exec antidetect-postgres pg_dump -U antidetect antidetect > backup.sql

# Restore
cat backup.sql | docker exec -i antidetect-postgres psql -U antidetect antidetect
```

### Redis Backup

```bash
# Backup Redis
docker exec antidetect-redis redis-cli SAVE
docker cp antidetect-redis:/data/dump.rdb ./redis-backup.rdb
```

## License

See main project LICENSE file.

## Support

For issues and questions, please open a GitHub issue in the main repository.
