#!/usr/bin/env node
/**
 * Auto-Fix Issues Script
 * Automatically detects and fixes common problems
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
log('║            UndetectBrowser Auto-Fix Tool                     ║', 'cyan');
log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
console.log('');

let issuesFound = 0;
let issuesFixed = 0;

function tryFix(name, check, fix) {
  log(`[CHECK] ${name}...`, 'magenta');

  if (!check()) {
    issuesFound++;
    log(`  [!] Issue detected`, 'yellow');

    try {
      fix();
      if (check()) {
        issuesFixed++;
        log(`  [OK] Fixed`, 'green');
        return true;
      } else {
        log(`  [X] Could not fix automatically`, 'red');
        return false;
      }
    } catch (e) {
      log(`  [X] Fix failed: ${e.message}`, 'red');
      return false;
    }
  } else {
    log(`  [OK] No issues`, 'green');
    return true;
  }
}

// ============================================================================
// Fix 1: Missing node_modules
// ============================================================================
tryFix(
  'node_modules',
  () => fs.existsSync(path.join(ROOT, 'node_modules')),
  () => {
    log('  [*] Running npm install...', 'cyan');
    execSync('npm install --legacy-peer-deps', { cwd: ROOT, stdio: 'inherit' });
  }
);

// ============================================================================
// Fix 2: Missing dist folder
// ============================================================================
tryFix(
  'TypeScript build (dist)',
  () => fs.existsSync(path.join(ROOT, 'dist')) &&
        fs.readdirSync(path.join(ROOT, 'dist')).length > 0,
  () => {
    log('  [*] Building TypeScript...', 'cyan');
    try {
      execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      log('  [*] Trying with --skipLibCheck...', 'yellow');
      execSync('npx tsc --skipLibCheck', { cwd: ROOT, stdio: 'inherit' });
    }
  }
);

// ============================================================================
// Fix 3: Missing .env
// ============================================================================
tryFix(
  '.env file',
  () => fs.existsSync(path.join(ROOT, '.env')),
  () => {
    const envExample = path.join(ROOT, '.env.example');
    const envPath = path.join(ROOT, '.env');

    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envPath);
    } else {
      // Create minimal .env
      const content = `# UndetectBrowser Configuration
PORT=3000
NODE_ENV=development
HOST=127.0.0.1
JWT_SECRET=auto-generated-${Date.now()}-${Math.random().toString(36)}
CLOUD_MODE=false
HEADLESS=false
LOG_LEVEL=info
DB_PATH=./data/undetect.db
PUPPETEER_SKIP_DOWNLOAD=false
`;
      fs.writeFileSync(envPath, content);
    }
  }
);

// ============================================================================
// Fix 4: Missing data directories
// ============================================================================
const dataDirs = ['data', 'data/profiles', 'data/sessions', 'data/logs', 'data/cache', 'data/temp'];

tryFix(
  'Data directories',
  () => dataDirs.every(dir => fs.existsSync(path.join(ROOT, dir))),
  () => {
    dataDirs.forEach(dir => {
      const fullPath = path.join(ROOT, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }
);

// ============================================================================
// Fix 5: Corrupted/missing critical packages
// ============================================================================
const criticalPackages = ['puppeteer', 'electron', 'express', 'typescript'];

tryFix(
  'Critical packages',
  () => {
    const nodeModules = path.join(ROOT, 'node_modules');
    if (!fs.existsSync(nodeModules)) return false;
    return criticalPackages.every(pkg =>
      fs.existsSync(path.join(nodeModules, pkg))
    );
  },
  () => {
    const missing = criticalPackages.filter(pkg =>
      !fs.existsSync(path.join(ROOT, 'node_modules', pkg))
    );
    if (missing.length > 0) {
      log(`  [*] Reinstalling: ${missing.join(', ')}`, 'cyan');
      execSync(`npm install ${missing.join(' ')} --legacy-peer-deps`, {
        cwd: ROOT,
        stdio: 'inherit'
      });
    }
  }
);

// ============================================================================
// Fix 6: Native module rebuild (Windows)
// ============================================================================
if (isWindows) {
  tryFix(
    'Native modules (bcrypt)',
    () => {
      try {
        require(path.join(ROOT, 'node_modules', 'bcrypt'));
        return true;
      } catch (e) {
        return false;
      }
    },
    () => {
      log('  [*] Rebuilding bcrypt...', 'cyan');
      try {
        execSync('npm rebuild bcrypt', { cwd: ROOT, stdio: 'inherit' });
      } catch (e) {
        log('  [!] bcrypt rebuild failed (optional module)', 'yellow');
      }
    }
  );
}

// ============================================================================
// Fix 7: Build resources
// ============================================================================
tryFix(
  'Build resources directory',
  () => fs.existsSync(path.join(ROOT, 'build')),
  () => {
    fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'build', '.gitkeep'), '');
  }
);

// ============================================================================
// Fix 8: Git configuration (Windows line endings)
// ============================================================================
if (isWindows) {
  tryFix(
    'Git line endings',
    () => {
      try {
        const result = execSync('git config --get core.autocrlf', {
          cwd: ROOT,
          encoding: 'utf8'
        }).trim();
        return result === 'true';
      } catch (e) {
        return true; // Git not installed or not a repo - skip
      }
    },
    () => {
      execSync('git config core.autocrlf true', { cwd: ROOT });
    }
  );
}

// ============================================================================
// Fix 9: package-lock.json integrity
// ============================================================================
tryFix(
  'package-lock.json',
  () => fs.existsSync(path.join(ROOT, 'package-lock.json')),
  () => {
    log('  [*] Regenerating package-lock.json...', 'cyan');
    execSync('npm install --package-lock-only --legacy-peer-deps', {
      cwd: ROOT,
      stdio: 'inherit'
    });
  }
);

// ============================================================================
// Summary
// ============================================================================
console.log('');
log('══════════════════════════════════════════════════════════════', 'cyan');
log('                         Summary                               ', 'cyan');
log('══════════════════════════════════════════════════════════════', 'cyan');
console.log('');

if (issuesFound === 0) {
  log('  No issues found! Everything is working correctly.', 'green');
} else {
  log(`  Issues found:  ${issuesFound}`, 'yellow');
  log(`  Issues fixed:  ${issuesFixed}`, 'green');

  if (issuesFound > issuesFixed) {
    log(`  Remaining:     ${issuesFound - issuesFixed}`, 'red');
    console.log('');
    log('  Some issues could not be fixed automatically.', 'yellow');
    log('  Please check the messages above.', 'yellow');
  } else {
    console.log('');
    log('  All issues were fixed successfully!', 'green');
  }
}

console.log('');
log('══════════════════════════════════════════════════════════════', 'cyan');
console.log('');

// Exit code
process.exit(issuesFound > issuesFixed ? 1 : 0);
