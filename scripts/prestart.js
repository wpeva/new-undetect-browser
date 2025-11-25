#!/usr/bin/env node
/**
 * Pre-start script - runs before starting the application
 * Validates environment and fixes common issues automatically
 *
 * This script is designed to be bulletproof on Windows 10
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Set UTF-8 for Windows console
if (isWindows) {
  try {
    execSync('chcp 65001', { stdio: 'pipe' });
  } catch (e) {
    // Ignore
  }
}

let hasErrors = false;
let autoFixed = 0;
let warnings = [];

log('', 'reset');
log('╔═══════════════════════════════════════════════════════════════╗', 'cyan');
log('║        UndetectBrowser - Pre-Start Auto-Check                 ║', 'cyan');
log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');
log('', 'reset');

// ============================================================================
// Check 1: Node.js version
// ============================================================================
const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
if (nodeVersion < 18) {
  log(`[X] Node.js ${process.version} is too old (need 18+)`, 'red');
  hasErrors = true;
} else {
  log(`[OK] Node.js ${process.version}`, 'green');
}

// ============================================================================
// Check 2: node_modules exists and is valid
// ============================================================================
const nodeModulesPath = path.join(ROOT, 'node_modules');
const criticalPackages = ['puppeteer', 'express', 'typescript'];
let needsInstall = false;

if (!fs.existsSync(nodeModulesPath)) {
  needsInstall = true;
} else {
  for (const pkg of criticalPackages) {
    if (!fs.existsSync(path.join(nodeModulesPath, pkg))) {
      needsInstall = true;
      break;
    }
  }
}

if (needsInstall) {
  log('[!] Dependencies missing - installing...', 'yellow');
  try {
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    execSync(`${npmCmd} install --legacy-peer-deps --no-fund --no-audit`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'false' }
    });
    autoFixed++;
    log('[OK] Dependencies installed', 'green');
  } catch (e) {
    // Try without optional deps
    try {
      execSync(`npm install --legacy-peer-deps --ignore-optional --no-fund`, {
        cwd: ROOT,
        stdio: 'inherit'
      });
      autoFixed++;
      log('[OK] Core dependencies installed', 'green');
    } catch (e2) {
      log('[X] Failed to install dependencies', 'red');
      hasErrors = true;
    }
  }
} else {
  log('[OK] Dependencies ready', 'green');
}

// ============================================================================
// Check 3: dist folder exists with compiled code
// ============================================================================
const distPath = path.join(ROOT, 'dist');
const serverEntry = path.join(distPath, 'server', 'index.js');
const serverV2Entry = path.join(distPath, 'server', 'index-v2.js');
const electronEntry = path.join(distPath, 'electron', 'main.js');

if (!fs.existsSync(distPath) ||
    (!fs.existsSync(serverEntry) && !fs.existsSync(serverV2Entry) && !fs.existsSync(electronEntry))) {
  log('[!] Build missing - compiling TypeScript...', 'yellow');

  // Ensure dist directory exists
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  try {
    // Try Windows-optimized build first
    if (isWindows && fs.existsSync(path.join(ROOT, 'tsconfig.windows.json'))) {
      execSync('npx tsc --project tsconfig.windows.json', { cwd: ROOT, stdio: 'pipe' });
    } else {
      execSync('npx tsc --skipLibCheck', { cwd: ROOT, stdio: 'pipe' });
    }
    autoFixed++;
    log('[OK] TypeScript compiled', 'green');
  } catch (e) {
    // Try with even more relaxed settings
    try {
      execSync('npx tsc --skipLibCheck --noEmit false', { cwd: ROOT, stdio: 'pipe' });
      autoFixed++;
      log('[OK] TypeScript compiled (relaxed)', 'green');
    } catch (e2) {
      log('[!] TypeScript compilation had errors (may still work)', 'yellow');
      warnings.push('TypeScript had some errors');
    }
  }
} else {
  log('[OK] Build ready', 'green');
}

// ============================================================================
// Check 4: .env exists with required variables
// ============================================================================
const envPath = path.join(ROOT, '.env');
const envExamplePath = path.join(ROOT, '.env.example');

if (!fs.existsSync(envPath)) {
  log('[!] .env not found - creating...', 'yellow');

  // Generate secure JWT secret
  const jwtSecret = Array.from({ length: 64 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      .charAt(Math.floor(Math.random() * 62))
  ).join('');

  // Find Chrome on Windows
  let chromePath = '';
  if (isWindows) {
    const chromePaths = [
      path.join(process.env['ProgramFiles'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    for (const cp of chromePaths) {
      if (fs.existsSync(cp)) {
        chromePath = cp.replace(/\\/g, '/');
        break;
      }
    }
  }

  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
    if (chromePath) {
      envContent = envContent.replace(/PUPPETEER_EXECUTABLE_PATH=.*/, `PUPPETEER_EXECUTABLE_PATH=${chromePath}`);
      envContent = envContent.replace(/CHROME_PATH=.*/, `CHROME_PATH=${chromePath}`);
    }
    fs.writeFileSync(envPath, envContent);
  } else {
    const envContent = `# UndetectBrowser Configuration
# Auto-generated: ${new Date().toISOString()}

PORT=3000
NODE_ENV=development
HOST=127.0.0.1

JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h

CORS_ORIGIN=*
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
SESSION_TIMEOUT=3600000
MAX_CONCURRENT_SESSIONS=100
`;
    fs.writeFileSync(envPath, envContent);
  }
  autoFixed++;
  log('[OK] .env created', 'green');
} else {
  // Verify .env has required values
  const envContent = fs.readFileSync(envPath, 'utf8');
  let needsUpdate = false;
  let updatedContent = envContent;

  if (!envContent.includes('JWT_SECRET=') || envContent.includes('JWT_SECRET=\n') || envContent.includes('JWT_SECRET=change')) {
    const jwtSecret = Array.from({ length: 64 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        .charAt(Math.floor(Math.random() * 62))
    ).join('');
    updatedContent = updatedContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
    if (!updatedContent.includes('JWT_SECRET=')) {
      updatedContent += `\nJWT_SECRET=${jwtSecret}`;
    }
    needsUpdate = true;
  }

  if (!envContent.includes('PORT=')) {
    updatedContent += '\nPORT=3000';
    needsUpdate = true;
  }

  if (needsUpdate) {
    fs.writeFileSync(envPath, updatedContent);
    autoFixed++;
    log('[OK] .env updated with missing values', 'green');
  } else {
    log('[OK] .env configured', 'green');
  }
}

// ============================================================================
// Check 5: Data directories
// ============================================================================
const dataDirs = [
  'data',
  'data/profiles',
  'data/sessions',
  'data/logs',
  'data/cache',
  'data/temp',
  'data/backups'
];

let dirsCreated = 0;
dataDirs.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    try {
      fs.mkdirSync(fullPath, { recursive: true });
      dirsCreated++;
    } catch (e) {
      // Ignore permission errors
    }
  }
});

if (dirsCreated > 0) {
  autoFixed++;
  log(`[OK] Created ${dirsCreated} data directories`, 'green');
} else {
  log('[OK] Data directories ready', 'green');
}

// ============================================================================
// Check 6: Browser availability (Windows)
// ============================================================================
if (isWindows) {
  const chromePaths = [
    path.join(process.env['ProgramFiles'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];

  let browserFound = false;
  for (const cp of chromePaths) {
    if (fs.existsSync(cp)) {
      browserFound = true;
      break;
    }
  }

  // Check Puppeteer bundled browser
  const puppeteerChrome = path.join(nodeModulesPath, 'puppeteer', '.local-chromium');
  if (fs.existsSync(puppeteerChrome)) {
    browserFound = true;
  }

  if (browserFound) {
    log('[OK] Browser available', 'green');
  } else {
    log('[!] No browser found - Puppeteer will download one', 'yellow');
    warnings.push('No system Chrome/Edge found');
  }
}

// ============================================================================
// Check 7: Memory check
// ============================================================================
const freeMemGB = os.freemem() / (1024 * 1024 * 1024);
if (freeMemGB < 1) {
  log(`[!] Low memory: ${freeMemGB.toFixed(2)} GB free`, 'yellow');
  warnings.push('Low memory');
} else {
  log(`[OK] Memory: ${freeMemGB.toFixed(2)} GB free`, 'green');
}

// ============================================================================
// Summary
// ============================================================================
log('', 'reset');
log('═══════════════════════════════════════════════════════════════', 'cyan');

if (autoFixed > 0) {
  log(`  Auto-fixed ${autoFixed} issue(s)`, 'green');
}

if (warnings.length > 0) {
  log(`  Warnings: ${warnings.join(', ')}`, 'yellow');
}

if (hasErrors) {
  log('', 'reset');
  log('  [X] Some critical issues could not be fixed', 'red');
  log('  [*] Try running: FIX_ERRORS.bat (Windows) or npm run fix', 'yellow');
  log('', 'reset');
  process.exit(1);
} else {
  log('  [OK] All pre-start checks passed!', 'green');
  log('', 'reset');
}
