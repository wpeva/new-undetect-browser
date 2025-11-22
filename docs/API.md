# API Documentation

**Session 12 of 15** - Anti-Detect Cloud Browser API Reference

Complete REST API documentation for the Anti-Detect Browser service.

## Base URL

```
https://api.antidetect.example.com/v1
```

## Authentication

All API requests require authentication using JWT tokens.

### Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Get Access Token

```http
POST /auth/login
```

**Request:**
```json
{
  "username": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900
}
```

## Sessions API

### Create Session

```http
POST /sessions
```

**Request:**
```json
{
  "deviceType": "desktop",
  "osType": "windows",
  "browserType": "chrome",
  "region": "US",
  "profile": {
    "rotationPolicy": "time-based",
    "rotationInterval": 86400000
  }
}
```

**Response:**
```json
{
  "sessionId": "session_abc123",
  "profileId": "profile_xyz789",
  "browserUrl": "ws://localhost:9222/devtools/browser/abc123",
  "detectionScore": 9.8,
  "expiresAt": 1704067200000,
  "metadata": {
    "deviceType": "desktop",
    "osType": "windows",
    "browserType": "chrome",
    "region": "US"
  }
}
```

### Get Session

```http
GET /sessions/:sessionId
```

**Response:**
```json
{
  "sessionId": "session_abc123",
  "status": "active",
  "createdAt": 1704063600000,
  "lastUsedAt": 1704066000000,
  "detectionScore": 9.8,
  "profile": {
    "profileId": "profile_xyz789",
    "fingerprint": { ... }
  }
}
```

### Navigate

```http
POST /sessions/:sessionId/navigate
```

**Request:**
```json
{
  "url": "https://example.com",
  "waitUntil": "networkidle0"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "statusCode": 200,
  "loadTime": 1250
}
```

### Execute Script

```http
POST /sessions/:sessionId/execute
```

**Request:**
```json
{
  "script": "return document.title;"
}
```

**Response:**
```json
{
  "result": "Example Domain",
  "executionTime": 5
}
```

### Click Element

```http
POST /sessions/:sessionId/click
```

**Request:**
```json
{
  "selector": "#button",
  "humanLike": true
}
```

**Response:**
```json
{
  "success": true,
  "elementFound": true,
  "clickTime": 350
}
```

### Type Text

```http
POST /sessions/:sessionId/type
```

**Request:**
```json
{
  "selector": "#input",
  "text": "Hello World",
  "humanLike": true,
  "typingSpeed": 50
}
```

**Response:**
```json
{
  "success": true,
  "charsTyped": 11,
  "duration": 2200
}
```

### Screenshot

```http
GET /sessions/:sessionId/screenshot
```

**Query Parameters:**
- `fullPage`: boolean (default: false)
- `format`: "png" | "jpeg" (default: "png")

**Response:**
```json
{
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "width": 1920,
  "height": 1080,
  "size": 125340
}
```

### Delete Session

```http
DELETE /sessions/:sessionId
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_abc123",
  "duration": 3600000
}
```

## Profiles API

### Generate Profile

```http
POST /profiles/generate
```

**Request:**
```json
{
  "deviceType": "desktop",
  "osType": "windows",
  "browserType": "chrome",
  "region": "US",
  "antiCorrelation": true,
  "minDissimilarity": 0.7
}
```

**Response:**
```json
{
  "profileId": "profile_xyz789",
  "fingerprint": {
    "navigator": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "platform": "Win32",
      "hardwareConcurrency": 8,
      "deviceMemory": 8
    },
    "screen": {
      "width": 1920,
      "height": 1080,
      "colorDepth": 24,
      "pixelRatio": 1
    },
    "webgl": {
      "vendor": "Google Inc. (NVIDIA Corporation)",
      "renderer": "ANGLE (NVIDIA GeForce RTX 3070 Direct3D11)"
    }
  },
  "behavior": {
    "mouseSpeed": 1200,
    "typingSpeed": 50,
    "scrollSpeed": 800
  },
  "detectionScore": 9.8
}
```

### Get Profile

```http
GET /profiles/:profileId
```

**Response:**
```json
{
  "profileId": "profile_xyz789",
  "createdAt": 1704063600000,
  "usageCount": 42,
  "detectionCount": 0,
  "detectionScore": 9.8,
  "fingerprint": { ... }
}
```

### Rotate Profile

```http
POST /profiles/:profileId/rotate
```

**Response:**
```json
{
  "oldProfileId": "profile_xyz789",
  "newProfileId": "profile_new123",
  "reason": "manual",
  "detectionScore": 9.9
}
```

## Analytics API

### Get Metrics

```http
GET /analytics/metrics
```

**Query Parameters:**
- `metric`: "detection_score" | "session_count" | "success_rate"
- `timeRange`: "last_hour" | "last_24_hours" | "last_7_days" | "last_30_days"
- `groupBy`: "os_type" | "device_type" | "hour" | "day"

**Response:**
```json
{
  "metric": "detection_score",
  "timeRange": "last_7_days",
  "data": [
    { "timestamp": 1704063600000, "value": 9.8 },
    { "timestamp": 1704150000000, "value": 9.9 }
  ],
  "summary": {
    "average": 9.85,
    "min": 9.2,
    "max": 10.0,
    "trend": "stable"
  }
}
```

### Export Report

```http
POST /analytics/export
```

**Request:**
```json
{
  "format": "csv",
  "metrics": ["detection_score", "session_count"],
  "timeRange": "last_30_days",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "jobId": "export_job_123",
  "status": "processing",
  "estimatedTime": 30,
  "downloadUrl": null
}
```

## Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| POST /sessions | 100/min |
| GET /sessions/:id | 1000/min |
| POST /sessions/:id/navigate | 60/min |
| POST /sessions/:id/execute | 120/min |
| POST /profiles/generate | 50/min |

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

**Error Response:**
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid device type",
    "details": {
      "parameter": "deviceType",
      "validValues": ["desktop", "mobile", "tablet"]
    }
  }
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @antidetect/sdk
```

```typescript
import { AntiDetectClient } from '@antidetect/sdk';

const client = new AntiDetectClient({
  apiKey: process.env.ANTIDETECT_API_KEY,
  baseUrl: 'https://api.antidetect.example.com/v1'
});

// Create session
const session = await client.sessions.create({
  deviceType: 'desktop',
  osType: 'windows'
});

// Navigate
await session.navigate('https://example.com');

// Execute script
const title = await session.execute('return document.title');

// Clean up
await session.close();
```

### Python

```bash
pip install antidetect-sdk
```

```python
from antidetect import AntiDetectClient

client = AntiDetectClient(
    api_key=os.getenv('ANTIDETECT_API_KEY'),
    base_url='https://api.antidetect.example.com/v1'
)

# Create session
session = client.sessions.create(
    device_type='desktop',
    os_type='windows'
)

# Navigate
session.navigate('https://example.com')

# Execute script
title = session.execute('return document.title')

# Clean up
session.close()
```

### Go

```bash
go get github.com/antidetect/sdk-go
```

```go
import "github.com/antidetect/sdk-go"

client := antidetect.NewClient(&antidetect.Config{
    APIKey: os.Getenv("ANTIDETECT_API_KEY"),
    BaseURL: "https://api.antidetect.example.com/v1",
})

// Create session
session, err := client.Sessions.Create(&antidetect.SessionOptions{
    DeviceType: "desktop",
    OSType: "windows",
})

// Navigate
err = session.Navigate("https://example.com")

// Execute script
title, err := session.Execute("return document.title")

// Clean up
session.Close()
```

---

**API Version:** 1.0.0
**Documentation:** https://docs.antidetect.example.com
**Support:** support@antidetect.example.com
