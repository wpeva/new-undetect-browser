#!/usr/bin/env node
/**
 * Setup Script - Complete project setup for Windows
 * Run this once after cloning the repository
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  log(`\n[Step ${step}] ${msg}`, 'magenta');
}

// Clear screen
console.clear();

log('╔══════════════════════════════════════════════════════════════╗', 'cyan');
log('║           UndetectBrowser Complete Setup                     ║', 'cyan');
log('║                    Windows Edition                           ║', 'cyan');
log('╚══════════════════════════════════════════════════════════════╝', 'cyan');

log(`\nPlatform: ${process.platform} (${process.arch})`, 'white');
log(`Node.js: ${process.version}`, 'white');
log(`Project: ${ROOT}\n`, 'white');

// ============================================================================
// Step 1: Check Node.js
// ============================================================================
logStep(1, 'Checking Node.js version');

const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
if (nodeVersion < 18) {
  log(`  [X] Node.js ${process.version} is too old`, 'red');
  log(`  [*] Please install Node.js 18+ from https://nodejs.org/`, 'yellow');
  process.exit(1);
}
log(`  [OK] Node.js ${process.version}`, 'green');

// ============================================================================
// Step 2: Create directories
// ============================================================================
logStep(2, 'Creating directory structure');

const directories = [
  'data',
  'data/profiles',
  'data/sessions',
  'data/logs',
  'data/cache',
  'data/temp',
  'dist',
  'build',
  'release',
];

directories.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    log(`  [+] Created: ${dir}`, 'green');
  }
});
log('  [OK] All directories ready', 'green');

// ============================================================================
// Step 3: Create .env
// ============================================================================
logStep(3, 'Setting up environment configuration');

const envPath = path.join(ROOT, '.env');
const envExamplePath = path.join(ROOT, '.env.example');

if (!fs.existsSync(envPath)) {
  // Find Chrome path on Windows
  let chromePath = '';
  if (isWindows) {
    const chromePaths = [
      process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',
    ];

    for (const cp of chromePaths) {
      if (fs.existsSync(cp)) {
        chromePath = cp.replace(/\\/g, '/');
        log(`  [*] Found Chrome: ${cp}`, 'cyan');
        break;
      }
    }
  }

  // Generate JWT secret
  const jwtSecret = Array.from({ length: 64 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      .charAt(Math.floor(Math.random() * 62))
  ).join('');

  let envContent;
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
    envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
    if (chromePath) {
      envContent = envContent.replace(/PUPPETEER_EXECUTABLE_PATH=.*/, `PUPPETEER_EXECUTABLE_PATH=${chromePath}`);
      envContent = envContent.replace(/CHROME_PATH=.*/, `CHROME_PATH=${chromePath}`);
      envContent = envContent.replace(/PUPPETEER_SKIP_DOWNLOAD=.*/, 'PUPPETEER_SKIP_DOWNLOAD=true');
    }
  } else {
    envContent = `# UndetectBrowser Configuration
# Generated: ${new Date().toISOString()}

PORT=3000
NODE_ENV=development
HOST=127.0.0.1

JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h

CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

ENABLE_COMPRESSION=true
CACHE_ENABLED=true

DB_PATH=./data/undetect.db

REDIS_ENABLED=false
POSTGRES_ENABLED=false

PUPPETEER_EXECUTABLE_PATH=${chromePath}
CHROME_PATH=${chromePath}
PUPPETEER_SKIP_DOWNLOAD=${chromePath ? 'true' : 'false'}
HEADLESS=false

CLOUD_MODE=false
LOG_LEVEL=info

ENABLE_REQUEST_LOGGING=true
SESSION_TIMEOUT=3600000
MAX_CONCURRENT_SESSIONS=100
`;
  }

  fs.writeFileSync(envPath, envContent);
  log('  [OK] .env file created', 'green');
} else {
  log('  [*] .env already exists', 'cyan');
}

// ============================================================================
// Step 4: Install dependencies
// ============================================================================
logStep(4, 'Installing npm dependencies');

log('  [*] This may take a few minutes...', 'cyan');

try {
  // Clear npm cache first
  log('  [*] Clearing npm cache...', 'cyan');
  execSync('npm cache clean --force', { cwd: ROOT, stdio: 'pipe' });

  // Install with legacy peer deps for compatibility
  log('  [*] Installing packages...', 'cyan');
  execSync('npm install --legacy-peer-deps', { cwd: ROOT, stdio: 'inherit' });

  log('  [OK] Dependencies installed', 'green');
} catch (e) {
  log('  [!] Some packages may have failed', 'yellow');
  log('  [*] Trying without optional dependencies...', 'cyan');

  try {
    execSync('npm install --legacy-peer-deps --ignore-optional', { cwd: ROOT, stdio: 'inherit' });
    log('  [OK] Core dependencies installed', 'green');
  } catch (e2) {
    log('  [X] Installation failed', 'red');
    log('  [*] Please try manually: npm install --legacy-peer-deps', 'yellow');
  }
}

// ============================================================================
// Step 5: Build TypeScript
// ============================================================================
logStep(5, 'Building TypeScript');

try {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  log('  [OK] TypeScript built successfully', 'green');
} catch (e) {
  log('  [!] Build had errors', 'yellow');
  log('  [*] Trying with --skipLibCheck...', 'cyan');

  try {
    execSync('npx tsc --skipLibCheck', { cwd: ROOT, stdio: 'inherit' });
    log('  [OK] Build completed with skipLibCheck', 'green');
  } catch (e2) {
    log('  [!] Build failed - but you can try running anyway', 'yellow');
  }
}

// ============================================================================
// Step 6: Verify installation
// ============================================================================
logStep(6, 'Verifying installation');

const verifications = [
  { name: 'node_modules', path: 'node_modules' },
  { name: 'dist folder', path: 'dist' },
  { name: '.env file', path: '.env' },
  { name: 'data directory', path: 'data' },
];

let allOk = true;
verifications.forEach(v => {
  if (fs.existsSync(path.join(ROOT, v.path))) {
    log(`  [OK] ${v.name}`, 'green');
  } else {
    log(`  [X] ${v.name}`, 'red');
    allOk = false;
  }
});

// ============================================================================
// Complete!
// ============================================================================
console.log('');
log('══════════════════════════════════════════════════════════════', 'cyan');

if (allOk) {
  log('               Setup Complete! Ready to use!                  ', 'green');
} else {
  log('          Setup Complete with some issues                     ', 'yellow');
}

log('══════════════════════════════════════════════════════════════', 'cyan');

console.log('');
log('Quick Start Commands:', 'white');
log('  npm run electron     - Launch desktop application', 'cyan');
log('  npm run server       - Start API server', 'cyan');
log('  npm run health       - Check project health', 'cyan');
log('  npm run fix          - Auto-fix issues', 'cyan');

if (isWindows) {
  console.log('');
  log('Windows Shortcuts:', 'white');
  log('  start.bat            - Launch desktop app', 'cyan');
  log('  start-server.bat     - Start server', 'cyan');
  log('  install.bat          - Reinstall everything', 'cyan');
}

console.log('');
log('Documentation:', 'white');
log('  README.md            - Getting started guide', 'cyan');
log('  QUICK_START_RU.md    - Quick start (Russian)', 'cyan');

console.log('');
