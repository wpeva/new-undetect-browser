#!/usr/bin/env node
/**
 * Pre-start script - runs before starting the application
 * Validates environment and fixes common issues automatically
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

let hasErrors = false;
let autoFixed = 0;

log('[*] Running pre-start checks...', 'cyan');

// Check 1: node_modules exists
if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
  log('[!] node_modules not found - running npm install...', 'yellow');
  try {
    execSync('npm install --legacy-peer-deps', { cwd: ROOT, stdio: 'inherit' });
    autoFixed++;
  } catch (e) {
    log('[X] Failed to install dependencies', 'red');
    hasErrors = true;
  }
}

// Check 2: dist folder exists
if (!fs.existsSync(path.join(ROOT, 'dist'))) {
  log('[!] dist folder not found - building TypeScript...', 'yellow');
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
    autoFixed++;
  } catch (e) {
    // Try with skipLibCheck
    try {
      execSync('npx tsc --skipLibCheck', { cwd: ROOT, stdio: 'inherit' });
      autoFixed++;
    } catch (e2) {
      log('[X] Failed to build TypeScript', 'red');
      hasErrors = true;
    }
  }
}

// Check 3: .env exists
if (!fs.existsSync(path.join(ROOT, '.env'))) {
  log('[!] .env not found - creating...', 'yellow');
  const envExample = path.join(ROOT, '.env.example');
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, path.join(ROOT, '.env'));
    autoFixed++;
  } else {
    // Create minimal .env
    fs.writeFileSync(path.join(ROOT, '.env'), `PORT=3000
NODE_ENV=development
HOST=127.0.0.1
JWT_SECRET=auto-generated-${Date.now()}
CLOUD_MODE=false
`);
    autoFixed++;
  }
}

// Check 4: data directories
const dataDirs = ['data', 'data/profiles', 'data/sessions', 'data/logs'];
dataDirs.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Summary
if (autoFixed > 0) {
  log(`[OK] Auto-fixed ${autoFixed} issue(s)`, 'green');
}

if (hasErrors) {
  log('[X] Some issues could not be fixed automatically', 'red');
  log('[*] Try running: npm run fix', 'yellow');
  process.exit(1);
} else {
  log('[OK] Pre-start checks passed', 'green');
}
