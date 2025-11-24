# ==================================
# UndetectBrowser Docker Image - OPTIMIZED
# Production-ready containerization with multi-stage build
# Optimizations: Layer caching, minimal image size, security hardening
# ==================================

# Stage 1: Builder
FROM node:20-bookworm-slim AS builder

# Install build dependencies in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json tsconfig.json ./

# Install ALL dependencies (including devDependencies for building)
# Skip Puppeteer's Chrome download as we install Chromium separately
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    NODE_ENV=production

# Use npm ci for faster, reproducible builds
RUN npm ci --include=dev \
    && npm cache clean --force

# Copy source code (separate layer for better caching)
COPY src ./src
COPY server ./server
COPY cloud ./cloud
COPY ml ./ml
COPY ml-profiles ./ml-profiles
COPY optimization ./optimization
COPY security ./security
COPY analytics ./analytics

# Build TypeScript with optimizations
RUN npm run build \
    && rm -rf src server cloud ml ml-profiles optimization security analytics

# ==================================
# Stage 2: Production Image - OPTIMIZED
FROM node:20-bookworm-slim

# Install Chromium and required dependencies (optimized layer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
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
    libasound2 \
    dumb-init \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/* \
    && rm -rf /tmp/*

# Set environment variables for Puppeteer and Node.js
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048 --enable-source-maps" \
    PORT=3000

# Create app directory
WORKDIR /app

# Create non-root user for security with specific UID/GID
RUN groupadd -r nodejs -g 1000 && \
    useradd -r -g nodejs -u 1000 nodejs && \
    mkdir -p /app/profiles /app/logs /app/.cache /app/data && \
    chown -R nodejs:nodejs /app

# Copy package files (as root for proper permissions)
COPY --chown=nodejs:nodejs package*.json ./

# Install ONLY production dependencies with optimizations
RUN npm ci --only=production --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /tmp/*

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy web files if exist
COPY --chown=nodejs:nodejs web ./web 2>/dev/null || true

# Copy .env.example
COPY --chown=nodejs:nodejs .env.example ./.env.example

# Set proper permissions
RUN chmod -R 750 /app \
    && chmod -R 770 /app/profiles /app/logs /app/.cache /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check (optimized with shorter intervals)
HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v2/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application with optimized Node.js flags
CMD ["node", "--max-old-space-size=2048", "--enable-source-maps", "dist/server/index.js"]
