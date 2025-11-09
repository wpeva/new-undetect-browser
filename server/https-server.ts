/**
 * HTTPS Server Configuration
 * Enables SSL/TLS for secure connections
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { logger } from '../src/utils/logger';

/**
 * SSL Certificate Configuration
 */
export interface SSLConfig {
  key: string;  // Path to private key
  cert: string; // Path to certificate
  ca?: string;  // Path to CA bundle (optional)
}

/**
 * Create HTTPS server with SSL certificates
 */
export function createHTTPSServer(app: any, sslConfig: SSLConfig): https.Server {
  try {
    // Read SSL certificates
    const privateKey = fs.readFileSync(sslConfig.key, 'utf8');
    const certificate = fs.readFileSync(sslConfig.cert, 'utf8');
    const ca = sslConfig.ca ? fs.readFileSync(sslConfig.ca, 'utf8') : undefined;

    // HTTPS options
    const httpsOptions: https.ServerOptions = {
      key: privateKey,
      cert: certificate,
      ca: ca,
      // Security options
      minVersion: 'TLSv1.2', // Minimum TLS version
      maxVersion: 'TLSv1.3', // Maximum TLS version
      ciphers: [
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
      ].join(':'),
      honorCipherOrder: true,
      // HSTS (HTTP Strict Transport Security)
      secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
    };

    // Create HTTPS server
    const httpsServer = https.createServer(httpsOptions, app);

    logger.info('HTTPS server configured successfully');
    logger.info(`SSL Key: ${sslConfig.key}`);
    logger.info(`SSL Cert: ${sslConfig.cert}`);
    if (sslConfig.ca) {
      logger.info(`SSL CA: ${sslConfig.ca}`);
    }

    return httpsServer;
  } catch (error) {
    logger.error('Failed to configure HTTPS server:', error);
    throw error;
  }
}

/**
 * Get SSL configuration from environment or default paths
 */
export function getSSLConfig(): SSLConfig | null {
  // Try environment variables first
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;
  const caPath = process.env.SSL_CA_PATH;

  if (keyPath && certPath) {
    if (!fs.existsSync(keyPath)) {
      logger.error(`SSL key not found: ${keyPath}`);
      return null;
    }
    if (!fs.existsSync(certPath)) {
      logger.error(`SSL certificate not found: ${certPath}`);
      return null;
    }

    return {
      key: keyPath,
      cert: certPath,
      ca: caPath && fs.existsSync(caPath) ? caPath : undefined,
    };
  }

  // Try default paths
  const defaultPaths = {
    key: path.join(process.cwd(), 'ssl', 'private.key'),
    cert: path.join(process.cwd(), 'ssl', 'certificate.crt'),
    ca: path.join(process.cwd(), 'ssl', 'ca_bundle.crt'),
  };

  if (fs.existsSync(defaultPaths.key) && fs.existsSync(defaultPaths.cert)) {
    return {
      key: defaultPaths.key,
      cert: defaultPaths.cert,
      ca: fs.existsSync(defaultPaths.ca) ? defaultPaths.ca : undefined,
    };
  }

  logger.warn('No SSL certificates found. Use HTTP or provide SSL certificates.');
  return null;
}

/**
 * Generate self-signed certificate for development
 * Note: This requires openssl to be installed
 */
export async function generateSelfSignedCert(): Promise<void> {
  const { execSync } = require('child_process');
  const sslDir = path.join(process.cwd(), 'ssl');

  // Create ssl directory
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
  }

  const keyPath = path.join(sslDir, 'private.key');
  const certPath = path.join(sslDir, 'certificate.crt');

  try {
    logger.info('Generating self-signed certificate...');

    // Generate private key
    execSync(`openssl genrsa -out ${keyPath} 2048`);

    // Generate certificate
    execSync(
      `openssl req -new -x509 -key ${keyPath} -out ${certPath} -days 365 ` +
      `-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`
    );

    logger.info('Self-signed certificate generated successfully');
    logger.info(`Key: ${keyPath}`);
    logger.info(`Certificate: ${certPath}`);
    logger.warn('⚠️  Self-signed certificates should only be used for development!');
  } catch (error) {
    logger.error('Failed to generate self-signed certificate:', error);
    throw error;
  }
}

/**
 * HTTPS Setup Instructions
 */
export const HTTPS_INSTRUCTIONS = `
# HTTPS Setup Instructions

## Option 1: Let's Encrypt (Recommended for production)

1. Install Certbot:
   \`\`\`bash
   sudo apt-get install certbot
   \`\`\`

2. Get certificate:
   \`\`\`bash
   sudo certbot certonly --standalone -d yourdomain.com
   \`\`\`

3. Set environment variables:
   \`\`\`bash
   export SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   export SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   \`\`\`

## Option 2: Self-Signed Certificate (Development only)

1. Generate certificate:
   \`\`\`bash
   node -e "require('./dist/server/https-server').generateSelfSignedCert()"
   \`\`\`

2. Certificates will be in ./ssl directory

## Option 3: Custom Certificate

1. Place your certificates in ./ssl directory:
   - private.key
   - certificate.crt
   - ca_bundle.crt (optional)

2. Or set environment variables:
   \`\`\`bash
   export SSL_KEY_PATH=/path/to/private.key
   export SSL_CERT_PATH=/path/to/certificate.crt
   export SSL_CA_PATH=/path/to/ca_bundle.crt
   \`\`\`

## Enable HTTPS

Set environment variable:
\`\`\`bash
export ENABLE_HTTPS=true
\`\`\`

Then start the server:
\`\`\`bash
npm run server
\`\`\`

The server will automatically use HTTPS if certificates are found.
`;
