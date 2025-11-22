/**
 * Server Entry Point
 *
 * Detects environment and starts appropriate server:
 * - CLOUD_MODE=true: Cloud API Server (Docker deployment)
 * - CLOUD_MODE=false/unset: Development Server (local testing)
 */

const CLOUD_MODE = process.env.CLOUD_MODE === 'true' || process.env.NODE_ENV === 'production';

if (CLOUD_MODE) {
  // Cloud deployment mode: Use Cloud API Server
  console.log('Starting in CLOUD MODE...');
  require('../cloud/api/server');
} else {
  // Development mode: Use original development server
  console.log('Starting in DEVELOPMENT MODE...');
  require('./index-v2');
}
