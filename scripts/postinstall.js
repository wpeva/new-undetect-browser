#!/usr/bin/env node
/**
 * Post-install script - runs after npm install
 * Creates necessary directories and validates environment
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSuccess(msg) { log(`[OK] ${msg}`, 'green'); }
function logInfo(msg) { log(`[*] ${msg}`, 'cyan'); }
function logWarn(msg) { log(`[!] ${msg}`, 'yellow'); }

log('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
log('║           UndetectBrowser Post-Install Setup                 ║', 'cyan');
log('╚══════════════════════════════════════════════════════════════╝\n', 'cyan');

// Step 1: Create directories
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

logInfo('Creating directories...');
directories.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    logSuccess(`Created: ${dir}`);
  }
});

// Step 2: Create .env if it doesn't exist
const envPath = path.join(ROOT, '.env');
const envExamplePath = path.join(ROOT, '.env.example');

if (!fs.existsSync(envPath)) {
  logInfo('Creating .env file...');

  if (fs.existsSync(envExamplePath)) {
    // Copy from example
    let envContent = fs.readFileSync(envExamplePath, 'utf8');

    // Windows-specific modifications
    if (isWindows) {
      // Try to find Chrome path
      const chromePaths = [
        process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',
      ];

      let chromePath = '';
      for (const cp of chromePaths) {
        if (fs.existsSync(cp)) {
          chromePath = cp.replace(/\\/g, '/');
          break;
        }
      }

      if (chromePath) {
        envContent = envContent.replace(
          /PUPPETEER_EXECUTABLE_PATH=.*/,
          `PUPPETEER_EXECUTABLE_PATH=${chromePath}`
        );
        envContent = envContent.replace(
          /CHROME_PATH=.*/,
          `CHROME_PATH=${chromePath}`
        );
      }

      // Set PUPPETEER_SKIP_DOWNLOAD based on Chrome availability
      envContent = envContent.replace(
        /PUPPETEER_SKIP_DOWNLOAD=.*/,
        `PUPPETEER_SKIP_DOWNLOAD=${chromePath ? 'true' : 'false'}`
      );
    }

    // Generate random JWT secret
    const jwtSecret = Array.from({ length: 64 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        .charAt(Math.floor(Math.random() * 62))
    ).join('');

    envContent = envContent.replace(
      /JWT_SECRET=.*/,
      `JWT_SECRET=${jwtSecret}`
    );

    fs.writeFileSync(envPath, envContent);
    logSuccess('.env file created');
  } else {
    // Create minimal .env
    const minimalEnv = `# UndetectBrowser Configuration
PORT=3000
NODE_ENV=development
HOST=127.0.0.1
JWT_SECRET=${Date.now()}-${Math.random().toString(36).substring(7)}
CLOUD_MODE=false
HEADLESS=false
LOG_LEVEL=info
DB_PATH=./data/undetect.db
PUPPETEER_SKIP_DOWNLOAD=false
`;
    fs.writeFileSync(envPath, minimalEnv);
    logSuccess('.env file created (minimal)');
  }
} else {
  logInfo('.env file already exists');
}

// Step 3: Create build resources directory
const buildDir = path.join(ROOT, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Create placeholder icon if doesn't exist
const iconPath = path.join(buildDir, 'icon.png');
if (!fs.existsSync(iconPath)) {
  logInfo('Icon files not found - using placeholder');
  // Create a simple placeholder file
  fs.writeFileSync(path.join(buildDir, '.gitkeep'), '# Build resources directory');
}

// Step 4: Platform-specific setup
if (isWindows) {
  logInfo('Windows detected - applying Windows-specific configuration...');

  // Check for Visual Studio Build Tools
  const vsWherePath = path.join(
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    'Microsoft Visual Studio',
    'Installer',
    'vswhere.exe'
  );

  if (!fs.existsSync(vsWherePath)) {
    logWarn('Visual Studio Build Tools may not be installed');
    logWarn('Native modules (bcrypt, sqlite3) may fail to compile');
    logWarn('Install from: https://visualstudio.microsoft.com/visual-cpp-build-tools/');
  }
}

// Step 5: Validate critical dependencies
logInfo('Validating dependencies...');

const criticalDeps = ['puppeteer', 'electron', 'express', 'typescript'];
const missingDeps = [];

criticalDeps.forEach(dep => {
  const depPath = path.join(ROOT, 'node_modules', dep);
  if (!fs.existsSync(depPath)) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  logWarn(`Some dependencies may need reinstalling: ${missingDeps.join(', ')}`);
} else {
  logSuccess('All critical dependencies installed');
}

// Final message
log('\n╔══════════════════════════════════════════════════════════════╗', 'green');
log('║                 Post-install complete!                       ║', 'green');
log('╚══════════════════════════════════════════════════════════════╝', 'green');

if (isWindows) {
  log('\nQuick Start (Windows):', 'yellow');
  log('  npm run electron     - Start GUI application', 'cyan');
  log('  npm run server       - Start API server', 'cyan');
  log('  npm run build        - Build TypeScript', 'cyan');
  log('  npm run health       - Check project health', 'cyan');
}

log('');
