# ==================================
# UndetectBrowser Docker Image
# Production-ready containerization with multi-stage build
# ==================================

# Stage 1: Builder
FROM node:20-bullseye-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY src ./src
COPY server ./server

# Build TypeScript
RUN npm run build

# ==================================
# Stage 2: Production Image
FROM node:20-bullseye-slim

# Install Chromium and required dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    NODE_ENV=production

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN groupadd -r nodejs && \
    useradd -r -g nodejs nodejs && \
    mkdir -p /app/profiles /app/logs /app/.cache && \
    chown -R nodejs:nodejs /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy web files
COPY --chown=nodejs:nodejs web ./web

# Create .env.example
RUN echo "# Environment Variables\n\
PORT=3000\n\
NODE_ENV=production\n\
JWT_SECRET=change-this-in-production\n\
JWT_EXPIRES_IN=24h\n\
ENABLE_AUTH=true\n\
CORS_ORIGIN=*\n\
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium" > .env.example

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server/index.js"]
