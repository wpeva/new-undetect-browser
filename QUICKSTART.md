# 🚀 Quick Start Guide - UndetectBrowser v2.0

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Start the enhanced server
node dist/server/index-v2.js
```

## Basic Usage

### Start Server
```bash
npm run build && node dist/server/index-v2.js
```

Server starts on http://localhost:3000

### API Examples

**Create Profile:**
```bash
curl -X POST http://localhost:3000/api/v2/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "My Profile"}'
```

**List Profiles:**
```bash
curl http://localhost:3000/api/v2/profiles
```

**Get Stats:**
```bash
curl http://localhost:3000/api/v2/stats
```

## Features

✅ SQLite Database (auto-created)
✅ REST API v2
✅ WebSocket Real-time
✅ Profile Management
✅ Proxy Management
✅ Statistics & Analytics

See IMPROVEMENTS.md for complete documentation.
