#!/usr/bin/env node
/**
 * Health Check Script
 * Comprehensive project health verification
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

console.log('');
log('╔══════════════════════════════════════════════════════════════╗', 'cyan');
log('║            UndetectBrowser Health Check                      ║', 'cyan');
log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
console.log('');

const checks = [];
let passed = 0;
let failed = 0;
let warnings = 0;

function addCheck(name, status, message = '') {
  checks.push({ name, status, message });
  if (status === 'pass') passed++;
  else if (status === 'fail') failed++;
  else warnings++;
}

// ============================================================================
// System Checks
// ============================================================================
log('System Environment:', 'magenta');

// Node.js version
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    addCheck('Node.js Version', 'pass', nodeVersion);
    log(`  [OK] Node.js ${nodeVersion}`, 'green');
  } else {
    addCheck('Node.js Version', 'fail', `${nodeVersion} (requires 18+)`);
    log(`  [X] Node.js ${nodeVersion} - requires 18+`, 'red');
  }
} catch (e) {
  addCheck('Node.js Version', 'fail', 'Not found');
  log('  [X] Node.js not found', 'red');
}

// npm version
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  addCheck('npm Version', 'pass', npmVersion);
  log(`  [OK] npm v${npmVersion}`, 'green');
} catch (e) {
  addCheck('npm Version', 'fail', 'Not found');
  log('  [X] npm not found', 'red');
}

// Platform
log(`  [*] Platform: ${process.platform} (${process.arch})`, 'cyan');

// ============================================================================
// Project Structure Checks
// ============================================================================
console.log('');
log('Project Structure:', 'magenta');

const requiredDirs = [
  'node_modules',
  'src',
  'server',
  'electron',
  'dist',
  'data',
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    addCheck(`Directory: ${dir}`, 'pass');
    log(`  [OK] ${dir}/`, 'green');
  } else {
    if (dir === 'dist' || dir === 'data') {
      addCheck(`Directory: ${dir}`, 'warn', 'Will be created');
      log(`  [!] ${dir}/ - will be created on build/run`, 'yellow');
    } else if (dir === 'node_modules') {
      addCheck(`Directory: ${dir}`, 'fail', 'Run npm install');
      log(`  [X] ${dir}/ - run npm install`, 'red');
    } else {
      addCheck(`Directory: ${dir}`, 'fail', 'Missing');
      log(`  [X] ${dir}/ - missing`, 'red');
    }
  }
});

// ============================================================================
// Configuration Files
// ============================================================================
console.log('');
log('Configuration Files:', 'magenta');

const requiredFiles = [
  { name: 'package.json', required: true },
  { name: 'tsconfig.json', required: true },
  { name: '.env', required: false, createFrom: '.env.example' },
  { name: '.env.example', required: true },
];

requiredFiles.forEach(file => {
  const fullPath = path.join(ROOT, file.name);
  if (fs.existsSync(fullPath)) {
    addCheck(`File: ${file.name}`, 'pass');
    log(`  [OK] ${file.name}`, 'green');
  } else if (file.createFrom && fs.existsSync(path.join(ROOT, file.createFrom))) {
    addCheck(`File: ${file.name}`, 'warn', `Create from ${file.createFrom}`);
    log(`  [!] ${file.name} - create from ${file.createFrom}`, 'yellow');
  } else if (file.required) {
    addCheck(`File: ${file.name}`, 'fail', 'Missing');
    log(`  [X] ${file.name} - missing`, 'red');
  }
});

// ============================================================================
// Dependencies Check
// ============================================================================
console.log('');
log('Critical Dependencies:', 'magenta');

const criticalDeps = [
  'puppeteer',
  'electron',
  'express',
  'typescript',
  'playwright',
  'puppeteer-extra',
  'puppeteer-extra-plugin-stealth',
];

const nodeModulesPath = path.join(ROOT, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      addCheck(`Dependency: ${dep}`, 'pass');
      log(`  [OK] ${dep}`, 'green');
    } else {
      addCheck(`Dependency: ${dep}`, 'fail', 'Not installed');
      log(`  [X] ${dep} - not installed`, 'red');
    }
  });
} else {
  log('  [X] node_modules not found - run npm install', 'red');
  criticalDeps.forEach(dep => {
    addCheck(`Dependency: ${dep}`, 'fail', 'node_modules missing');
  });
}

// ============================================================================
// TypeScript Build Check
// ============================================================================
console.log('');
log('Build Status:', 'magenta');

const distPath = path.join(ROOT, 'dist');
if (fs.existsSync(distPath)) {
  const distFiles = fs.readdirSync(distPath);
  if (distFiles.length > 0) {
    addCheck('TypeScript Build', 'pass');
    log('  [OK] TypeScript compiled', 'green');

    // Check for main entry points
    const entryPoints = [
      'dist/src/index.js',
      'dist/server/index.js',
      'dist/electron/main.js',
    ];

    entryPoints.forEach(entry => {
      if (fs.existsSync(path.join(ROOT, entry))) {
        log(`  [OK] ${entry}`, 'green');
      } else {
        log(`  [!] ${entry} - may need rebuild`, 'yellow');
      }
    });
  } else {
    addCheck('TypeScript Build', 'warn', 'Empty - needs build');
    log('  [!] dist/ is empty - run npm run build', 'yellow');
  }
} else {
  addCheck('TypeScript Build', 'warn', 'Not built');
  log('  [!] Not built - run npm run build', 'yellow');
}

// ============================================================================
// Browser Check (for Puppeteer)
// ============================================================================
console.log('');
log('Browser Configuration:', 'magenta');

// Check for system Chrome
let systemChrome = null;
if (isWindows) {
  const chromePaths = [
    process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const cp of chromePaths) {
    if (fs.existsSync(cp)) {
      systemChrome = cp;
      break;
    }
  }
}

if (systemChrome) {
  addCheck('System Chrome', 'pass', systemChrome);
  log(`  [OK] Chrome: ${systemChrome}`, 'green');
} else {
  addCheck('System Chrome', 'warn', 'Not found - Puppeteer will download');
  log('  [!] System Chrome not found', 'yellow');
  log('  [*] Puppeteer will use its own Chromium', 'cyan');
}

// Check Puppeteer's browser
const puppeteerCachePath = path.join(
  process.env['USERPROFILE'] || process.env['HOME'] || '',
  '.cache',
  'puppeteer'
);

if (fs.existsSync(puppeteerCachePath)) {
  addCheck('Puppeteer Browser Cache', 'pass');
  log('  [OK] Puppeteer browser cache exists', 'green');
} else {
  addCheck('Puppeteer Browser Cache', 'warn', 'Will be created on first run');
  log('  [!] Puppeteer browser will be downloaded on first run', 'yellow');
}

// ============================================================================
// Port Availability
// ============================================================================
console.log('');
log('Network:', 'magenta');

try {
  const result = spawnSync(isWindows ? 'netstat' : 'lsof',
    isWindows ? ['-ano'] : ['-i', ':3000'],
    { encoding: 'utf8' }
  );

  if (isWindows) {
    const port3000InUse = result.stdout && result.stdout.includes(':3000');
    if (port3000InUse) {
      addCheck('Port 3000', 'warn', 'In use');
      log('  [!] Port 3000 is in use', 'yellow');
    } else {
      addCheck('Port 3000', 'pass', 'Available');
      log('  [OK] Port 3000 available', 'green');
    }
  } else {
    if (result.stdout && result.stdout.trim()) {
      addCheck('Port 3000', 'warn', 'In use');
      log('  [!] Port 3000 is in use', 'yellow');
    } else {
      addCheck('Port 3000', 'pass', 'Available');
      log('  [OK] Port 3000 available', 'green');
    }
  }
} catch (e) {
  addCheck('Port 3000', 'warn', 'Could not check');
  log('  [!] Could not check port availability', 'yellow');
}

// ============================================================================
// Summary
// ============================================================================
console.log('');
log('══════════════════════════════════════════════════════════════', 'cyan');
log('                         Summary                               ', 'cyan');
log('══════════════════════════════════════════════════════════════', 'cyan');
console.log('');

log(`  Passed:   ${passed}`, 'green');
log(`  Warnings: ${warnings}`, 'yellow');
log(`  Failed:   ${failed}`, 'red');
console.log('');

if (failed === 0 && warnings === 0) {
  log('  Status: HEALTHY - Ready to run!', 'green');
} else if (failed === 0) {
  log('  Status: OK with warnings - Should work', 'yellow');
} else {
  log('  Status: ISSUES FOUND - Run npm run fix', 'red');
}

console.log('');
log('══════════════════════════════════════════════════════════════', 'cyan');

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
