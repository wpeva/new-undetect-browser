# 🚀 UndetectBrowser - Complete Deployment Guide

**Version**: 2.0.0
**Date**: 2025-11-09
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Docker Deployment](#docker-deployment)
5. [Manual Deployment](#manual-deployment)
6. [HTTPS/SSL Configuration](#httpsssl-configuration)
7. [Authentication Setup](#authentication-setup)
8. [Environment Variables](#environment-variables)
9. [Production Checklist](#production-checklist)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

UndetectBrowser is an enterprise-grade anti-detection browser with:
- **JWT Authentication** - Secure user management
- **Rate Limiting** - API protection
- **Profile Manager** - Full CRUD browser profiles
- **Docker Support** - Containerized deployment
- **HTTPS/SSL** - Secure connections
- **Beautiful UI** - Professional web interface

---

## 📦 Prerequisites

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 2GB
- Disk: 10GB
- OS: Linux/macOS/Windows

**Recommended (Production)**:
- CPU: 4+ cores
- RAM: 4GB+
- Disk: 20GB+
- OS: Ubuntu 20.04+ / Debian 11+

### Software Requirements

- **Node.js**: 18.x or 20.x
- **npm**: 9.x+
- **Docker**: 20.x+ (optional)
- **Docker Compose**: 2.x+ (optional)
- **Chromium**: Installed automatically

---

## ⚡ Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd undetect-browser

# Configure environment
cp .env.example .env
nano .env  # Edit as needed

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Access UI
open http://localhost:3000
```

### Option 2: Manual

```bash
# Install dependencies
npm install

# Build project
npm run build

# Start server
npm run server

# Access UI
open http://localhost:3000
```

---

## 🐳 Docker Deployment

### Basic Deployment

```bash
# Build image
docker build -t undetect-browser:latest .

# Run container
docker run -d \
  --name undetect-browser \
  -p 3000:3000 \
  -v $(pwd)/profiles:/app/profiles \
  -v $(pwd)/logs:/app/logs \
  -e JWT_SECRET=your-secret-key \
  -e ENABLE_AUTH=true \
  undetect-browser:latest
```

### Docker Compose Deployment

**docker-compose.yml** (included):
```yaml
version: '3.8'

services:
  undetect-browser:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - ENABLE_AUTH=true
    volumes:
      - ./profiles:/app/profiles
      - ./logs:/app/logs
    restart: unless-stopped
```

**Commands**:
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update image
docker-compose pull
docker-compose up -d
```

### Docker Production Configuration

**Environment File** (.env):
```bash
# Server
PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRES_IN=24h
ENABLE_AUTH=true

# CORS
CORS_ORIGIN=https://yourdomain.com

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Resource Limits** (docker-compose.yml):
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4G
    reservations:
      cpus: '1.0'
      memory: 2G
```

---

## 🔧 Manual Deployment

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd undetect-browser

# 2. Install dependencies
npm ci --only=production

# 3. Build TypeScript
npm run build

# 4. Verify build
ls -la dist/
```

### Configuration

Create `.env` file:
```bash
# Copy example
cp .env.example .env

# Edit configuration
nano .env
```

**.env Example**:
```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
ENABLE_AUTH=true

# CORS
CORS_ORIGIN=*  # Use specific domain in production

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# HTTPS (optional)
ENABLE_HTTPS=false
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
```

### Running

#### Development Mode

```bash
npm run server:dev
```

#### Production Mode

```bash
# Start server
npm run server

# Or with PM2 (recommended)
npm install -g pm2
pm2 start dist/server/index.js --name undetect-browser
pm2 save
pm2 startup  # Follow instructions
```

### Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server/index.js \
  --name undetect-browser \
  --instances 2 \
  --env production

# Monitor
pm2 monit

# View logs
pm2 logs undetect-browser

# Restart
pm2 restart undetect-browser

# Stop
pm2 stop undetect-browser

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

**PM2 Configuration** (ecosystem.config.js):
```javascript
module.exports = {
  apps: [{
    name: 'undetect-browser',
    script: './dist/server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      JWT_SECRET: 'your-secret-key',
      ENABLE_AUTH: 'true'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '2G'
  }]
};
```

---

## 🔒 HTTPS/SSL Configuration

### Option 1: Let's Encrypt (Recommended)

```bash
# 1. Install Certbot
sudo apt-get update
sudo apt-get install certbot

# 2. Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# 3. Configure environment
export SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
export SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
export ENABLE_HTTPS=true

# 4. Auto-renewal
sudo certbot renew --dry-run
```

### Option 2: Self-Signed Certificate (Development)

```bash
# Generate certificate
openssl genrsa -out ssl/private.key 2048
openssl req -new -x509 \
  -key ssl/private.key \
  -out ssl/certificate.crt \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Configure
export SSL_KEY_PATH=./ssl/private.key
export SSL_CERT_PATH=./ssl/certificate.crt
export ENABLE_HTTPS=true
```

### Option 3: Custom Certificate

Place your certificates:
```
ssl/
├── private.key
├── certificate.crt
└── ca_bundle.crt (optional)
```

Configure environment:
```bash
export SSL_KEY_PATH=./ssl/private.key
export SSL_CERT_PATH=./ssl/certificate.crt
export SSL_CA_PATH=./ssl/ca_bundle.crt
export ENABLE_HTTPS=true
```

---

## 🔑 Authentication Setup

### Default Credentials

**Username**: `admin`
**Password**: `admin123`
**Role**: admin

⚠️ **IMPORTANT**: Change default credentials immediately!

### Create New User

**API Request**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "securepassword",
    "email": "user@example.com"
  }'
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "2",
    "username": "newuser",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Using Authentication

**With Token**:
```bash
# Get token from login response
TOKEN="your-jwt-token"

# Use in requests
curl http://localhost:3000/api/profiles \
  -H "Authorization: Bearer $TOKEN"
```

### Disable Authentication (Development)

```bash
export ENABLE_AUTH=false
npm run server
```

---

## 🔢 Environment Variables

### Complete List

```bash
# ============================================
# Server Configuration
# ============================================
PORT=3000                    # Server port
NODE_ENV=production          # Environment (development/production)

# ============================================
# Authentication
# ============================================
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=24h          # Token expiration (24h, 7d, 30d)
ENABLE_AUTH=true            # Enable/disable auth

# ============================================
# CORS
# ============================================
CORS_ORIGIN=*               # Allowed origins (* or specific domain)

# ============================================
# Puppeteer
# ============================================
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
CHROME_PATH=/usr/bin/chromium

# ============================================
# HTTPS/SSL
# ============================================
ENABLE_HTTPS=false          # Enable HTTPS
SSL_KEY_PATH=/path/to/key
SSL_CERT_PATH=/path/to/cert
SSL_CA_PATH=/path/to/ca     # Optional

# ============================================
# Logging
# ============================================
LOG_LEVEL=info              # debug, info, warn, error
```

---

## ✅ Production Checklist

### Security

- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET (min 32 characters)
- [ ] Enable authentication (`ENABLE_AUTH=true`)
- [ ] Configure CORS_ORIGIN to specific domain
- [ ] Enable HTTPS with valid certificate
- [ ] Use environment variables for secrets
- [ ] Run as non-root user
- [ ] Configure firewall rules

### Performance

- [ ] Set NODE_ENV=production
- [ ] Configure resource limits (Docker/PM2)
- [ ] Enable process clustering (PM2)
- [ ] Configure log rotation
- [ ] Monitor memory usage
- [ ] Set up health checks

### Monitoring

- [ ] Configure logging
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor uptime
- [ ] Track API response times
- [ ] Monitor browser sessions
- [ ] Set up alerts

### Backup

- [ ] Backup profiles directory
- [ ] Backup database (if applicable)
- [ ] Backup SSL certificates
- [ ] Document recovery procedures

---

## 📊 Monitoring

### Health Check

```bash
# Check server health
curl http://localhost:3000/api/health

# Response
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": 1699564800000,
  "memory": {...},
  "authEnabled": true
}
```

### System Stats

```bash
# Get system statistics
curl http://localhost:3000/api/stats

# Response
{
  "activeBrowsers": 2,
  "totalMemory": 536870912,
  "usedMemory": 134217728,
  "uptime": 12345,
  "sessions": [...]
}
```

### Logs

```bash
# Docker logs
docker-compose logs -f

# PM2 logs
pm2 logs undetect-browser

# Manual logs
tail -f logs/error.log
tail -f logs/out.log
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
export PORT=3001
npm run server
```

#### 2. Chrome Not Found

```bash
# Install Chromium (Ubuntu/Debian)
sudo apt-get install chromium-browser

# Install Chromium (macOS)
brew install chromium

# Verify installation
which chromium
```

#### 3. Permission Denied

```bash
# Give execute permissions
chmod +x dist/server/index.js

# Or run as sudo (not recommended)
sudo npm run server
```

#### 4. TypeScript Build Errors

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

#### 5. JWT Token Issues

```bash
# Regenerate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env
JWT_SECRET=<new-secret>
```

### Debug Mode

```bash
# Enable debug logs
export LOG_LEVEL=debug
npm run server
```

---

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Profile Endpoints

- `GET /api/profiles` - List all profiles
- `GET /api/profiles/:id` - Get single profile
- `POST /api/profiles` - Create new profile
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile
- `POST /api/profiles/:id/clone` - Clone profile
- `POST /api/profiles/:id/use` - Mark as used

### Browser Endpoints

- `POST /api/browser/launch` - Launch browser
- `POST /api/browser/:id/navigate` - Navigate to URL
- `POST /api/browser/:id/screenshot` - Take screenshot
- `GET /api/browser/:id/info` - Get browser info
- `POST /api/browser/:id/close` - Close browser
- `GET /api/browser/sessions` - List active sessions
- `POST /api/browser/:id/execute` - Execute JavaScript

### System Endpoints

- `GET /api/health` - Health check
- `GET /api/stats` - System statistics

---

## 🎓 Best Practices

### Security

1. **Never commit secrets** - Use environment variables
2. **Rotate JWT secrets** - Regularly update secrets
3. **Use HTTPS in production** - Always encrypt traffic
4. **Implement rate limiting** - Already configured
5. **Monitor logs** - Set up log aggregation
6. **Regular updates** - Keep dependencies updated

### Performance

1. **Use process clustering** - PM2 with multiple instances
2. **Configure resource limits** - Prevent memory leaks
3. **Enable caching** - Already implemented
4. **Monitor metrics** - Set up monitoring tools
5. **Load balancing** - Use nginx/HAProxy for multiple instances

### Maintenance

1. **Regular backups** - Backup profiles and data
2. **Update dependencies** - `npm audit` and update
3. **Monitor disk space** - Profiles can grow large
4. **Clean old sessions** - Implement cleanup jobs
5. **Test before deploy** - Always test updates

---

## 🌐 Nginx Reverse Proxy

### Configuration

**/etc/nginx/sites-available/undetect-browser**:
```nginx
upstream undetect_backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy settings
    location / {
        proxy_pass http://undetect_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://undetect_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Enable and restart**:
```bash
sudo ln -s /etc/nginx/sites-available/undetect-browser /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📞 Support

### Resources

- **Documentation**: [docs/](./docs/)
- **API Reference**: [API.md](docs/API.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

### Contact

- **Email**: support@example.com
- **Discord**: [Join Server](https://discord.gg/example)
- **Twitter**: [@UndetectBrowser](https://twitter.com/example)

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details

---

**🚀 Happy Deploying!**

*UndetectBrowser - The Ultimate Anti-Detection Browser*
