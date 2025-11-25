#!/usr/bin/env node
/**
 * Auto-Recovery System for UndetectBrowser
 * Automatically detects and fixes common runtime errors
 *
 * Usage:
 *   node scripts/auto-recovery.js          - Run diagnostics and fix
 *   node scripts/auto-recovery.js --check  - Check only (no fixes)
 *   node scripts/auto-recovery.js --watch  - Watch mode (continuous monitoring)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`═══════════════════════════════════════════════════`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`═══════════════════════════════════════════════════`, 'cyan');
}

// ============================================================================
// ERROR DETECTION FUNCTIONS
// ============================================================================

const errorDetectors = {
  // Check if node_modules exists and is valid
  checkNodeModules() {
    const nodeModulesPath = path.join(ROOT, 'node_modules');
    const criticalPackages = ['puppeteer', 'playwright', 'express', 'typescript', 'electron'];

    if (!fs.existsSync(nodeModulesPath)) {
      return { error: 'node_modules missing', fix: 'reinstallDependencies' };
    }

    for (const pkg of criticalPackages) {
      const pkgPath = path.join(nodeModulesPath, pkg);
      if (!fs.existsSync(pkgPath)) {
        return { error: `Missing package: ${pkg}`, fix: 'reinstallDependencies' };
      }
    }

    return { ok: true };
  },

  // Check if .env exists and has required values
  checkEnvFile() {
    const envPath = path.join(ROOT, '.env');

    if (!fs.existsSync(envPath)) {
      return { error: '.env file missing', fix: 'createEnvFile' };
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = ['PORT', 'JWT_SECRET'];

    for (const v of requiredVars) {
      if (!envContent.includes(`${v}=`)) {
        return { error: `.env missing ${v}`, fix: 'repairEnvFile' };
      }
    }

    return { ok: true };
  },

  // Check if build exists
  checkBuild() {
    const distPath = path.join(ROOT, 'dist');
    const serverEntry = path.join(distPath, 'server', 'index.js');
    const electronEntry = path.join(distPath, 'electron', 'main.js');

    if (!fs.existsSync(distPath)) {
      return { error: 'dist folder missing', fix: 'rebuildProject' };
    }

    if (!fs.existsSync(serverEntry) && !fs.existsSync(electronEntry)) {
      return { error: 'Build incomplete', fix: 'rebuildProject' };
    }

    return { ok: true };
  },

  // Check data directories
  checkDataDirs() {
    const requiredDirs = ['data', 'data/profiles', 'data/sessions', 'data/logs', 'data/cache'];

    for (const dir of requiredDirs) {
      const dirPath = path.join(ROOT, dir);
      if (!fs.existsSync(dirPath)) {
        return { error: `Missing directory: ${dir}`, fix: 'createDataDirs' };
      }
    }

    return { ok: true };
  },

  // Check port availability
  async checkPort() {
    const port = process.env.PORT || 3000;

    try {
      const net = require('net');
      return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            resolve({ error: `Port ${port} is in use`, fix: 'showPortInfo' });
          } else {
            resolve({ ok: true });
          }
        });
        server.once('listening', () => {
          server.close();
          resolve({ ok: true });
        });
        server.listen(port);
      });
    } catch (e) {
      return { ok: true };
    }
  },

  // Check Chrome/browser availability
  checkBrowser() {
    const chromePaths = isWindows ? [
      path.join(process.env['ProgramFiles'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['ProgramFiles'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ] : [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];

    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        return { ok: true, browser: chromePath };
      }
    }

    // Check for Puppeteer's bundled Chromium
    const puppeteerChromium = path.join(ROOT, 'node_modules', 'puppeteer', '.local-chromium');
    if (fs.existsSync(puppeteerChromium)) {
      return { ok: true, browser: 'puppeteer-bundled' };
    }

    return { error: 'No browser found', fix: 'installBrowser' };
  },

  // Check TypeScript configuration
  checkTsConfig() {
    const tsConfigPath = path.join(ROOT, 'tsconfig.json');
    const tsConfigWinPath = path.join(ROOT, 'tsconfig.windows.json');

    if (!fs.existsSync(tsConfigPath)) {
      return { error: 'tsconfig.json missing', fix: 'createTsConfig' };
    }

    // Ensure Windows config exists
    if (isWindows && !fs.existsSync(tsConfigWinPath)) {
      return { error: 'tsconfig.windows.json missing', fix: 'createTsConfigWindows' };
    }

    return { ok: true };
  },

  // Check for common file permission issues (Windows)
  checkPermissions() {
    if (!isWindows) return { ok: true };

    const testFile = path.join(ROOT, 'data', '.permission-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return { ok: true };
    } catch (e) {
      return { error: 'Permission issues detected', fix: 'fixPermissions' };
    }
  },

  // Check memory availability
  checkMemory() {
    const freeMem = os.freemem() / (1024 * 1024 * 1024); // GB
    if (freeMem < 1) {
      return { warning: `Low memory: ${freeMem.toFixed(2)} GB free`, fix: null };
    }
    return { ok: true, memory: `${freeMem.toFixed(2)} GB free` };
  },
};

// ============================================================================
// FIX FUNCTIONS
// ============================================================================

const fixes = {
  reinstallDependencies() {
    log('  [*] Reinstalling dependencies...', 'yellow');
    try {
      // Remove node_modules if corrupted
      const nodeModulesPath = path.join(ROOT, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }

      // Clear npm cache
      execSync('npm cache clean --force', { cwd: ROOT, stdio: 'pipe' });

      // Reinstall
      execSync('npm install --legacy-peer-deps --no-fund --no-audit', {
        cwd: ROOT,
        stdio: 'inherit'
      });

      log('  [OK] Dependencies reinstalled', 'green');
      return true;
    } catch (e) {
      log(`  [X] Failed: ${e.message}`, 'red');
      return false;
    }
  },

  createEnvFile() {
    log('  [*] Creating .env file...', 'yellow');
    const envPath = path.join(ROOT, '.env');
    const envExamplePath = path.join(ROOT, '.env.example');

    try {
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
      } else {
        const content = `# UndetectBrowser Configuration
PORT=3000
NODE_ENV=development
HOST=127.0.0.1
JWT_SECRET=${generateSecret(64)}
HEADLESS=false
CLOUD_MODE=false
DB_PATH=./data/undetect.db
LOG_LEVEL=info
`;
        fs.writeFileSync(envPath, content);
      }
      log('  [OK] .env created', 'green');
      return true;
    } catch (e) {
      log(`  [X] Failed: ${e.message}`, 'red');
      return false;
    }
  },

  repairEnvFile() {
    log('  [*] Repairing .env file...', 'yellow');
    const envPath = path.join(ROOT, '.env');

    try {
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      // Add missing required variables
      if (!content.includes('PORT=')) content += '\nPORT=3000';
      if (!content.includes('JWT_SECRET=')) content += `\nJWT_SECRET=${generateSecret(64)}`;
      if (!content.includes('NODE_ENV=')) content += '\nNODE_ENV=development';

      fs.writeFileSync(envPath, content);
      log('  [OK] .env repaired', 'green');
      return true;
    } catch (e) {
      log(`  [X] Failed: ${e.message}`, 'red');
      return false;
    }
  },

  rebuildProject() {
    log('  [*] Rebuilding project...', 'yellow');
    try {
      // Clean dist
      const distPath = path.join(ROOT, 'dist');
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
      }
      fs.mkdirSync(distPath, { recursive: true });

      // Try Windows build first, then fallback
      try {
        execSync('npx tsc --project tsconfig.windows.json', { cwd: ROOT, stdio: 'pipe' });
      } catch {
        try {
          execSync('npx tsc --skipLibCheck', { cwd: ROOT, stdio: 'pipe' });
        } catch {
          execSync('npx tsc', { cwd: ROOT, stdio: 'pipe' });
        }
      }

      log('  [OK] Project rebuilt', 'green');
      return true;
    } catch (e) {
      log(`  [X] Failed: ${e.message}`, 'red');
      return false;
    }
  },

  createDataDirs() {
    log('  [*] Creating data directories...', 'yellow');
    const dirs = ['data', 'data/profiles', 'data/sessions', 'data/logs', 'data/cache', 'data/temp', 'data/backups'];

    try {
      for (const dir of dirs) {
        const dirPath = path.join(ROOT, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }
      log('  [OK] Data directories created', 'green');
      return true;
    } catch (e) {
      log(`  [X] Failed: ${e.message}`, 'red');
      return false;
    }
  },

  showPortInfo() {
    log('  [!] Port conflict detected', 'yellow');
    log('  [*] To free the port, run:', 'cyan');
    if (isWindows) {
      log('      netstat -ano | findstr :3000', 'cyan');
      log('      taskkill /PID <PID> /F', 'cyan');
    } else {
      log('      lsof -i :3000', 'cyan');
      log('      kill -9 <PID>', 'cyan');
    }
    return true;
  },

  installBrowser() {
    log('  [*] Installing Puppeteer browser...', 'yellow');
    try {
      execSync('npx puppeteer browsers install chrome', { cwd: ROOT, stdio: 'inherit' });
      log('  [OK] Browser installed', 'green');
      return true;
    } catch (e) {
      log(`  [!] Failed to install browser: ${e.message}`, 'yellow');
      log('  [*] Please install Chrome manually from: https://www.google.com/chrome/', 'cyan');
      return false;
    }
  },

  createTsConfig() {
    log('  [*] Creating tsconfig.json...', 'yellow');
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: '.',
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true
      },
      include: ['src/**/*', 'server/**/*', 'electron/**/*'],
      exclude: ['node_modules', 'dist', 'tests']
    };

    try {
      fs.writeFileSync(path.join(ROOT, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
      log('  [OK] tsconfig.json created', 'green');
      return true;
    } catch (e) {
      log(`  [X] Failed: ${e.message}`, 'red');
      return false;
    }
  },

  createTsConfigWindows() {
    log('  [*] Creating tsconfig.windows.json...', 'yellow');
    const tsConfig = {
      extends: './tsconfig.json',
      compilerOptions: {
        strict: false,
        noImplicitAny: false,
        skipLibCheck: true
      },
      exclude: ['node_modules', 'dist', 'tests', 'cloud', 'ml', 'optimization', 'kubernetes']
    };

    try {
      fs.writeFileSync(path.join(ROOT, 'tsconfig.windows.json'), JSON.stringify(tsConfig, null, 2));
      log('  [OK] tsconfig.windows.json created', 'green');
      return true;
    } catch (e) {
      log(`  [X] Failed: ${e.message}`, 'red');
      return false;
    }
  },

  fixPermissions() {
    log('  [*] Fixing permissions...', 'yellow');
    if (isWindows) {
      try {
        execSync(`attrib -r "${path.join(ROOT, 'data')}\\*.*" /s`, { stdio: 'pipe' });
        execSync(`attrib -r "${path.join(ROOT, 'dist')}\\*.*" /s`, { stdio: 'pipe' });
        log('  [OK] Permissions fixed', 'green');
        return true;
      } catch (e) {
        log(`  [X] Failed: ${e.message}`, 'red');
        return false;
      }
    }
    return true;
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateSecret(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

async function runDiagnostics(applyFixes = true) {
  logSection('UndetectBrowser Auto-Recovery System');

  log(`Platform: ${process.platform} (${process.arch})`, 'cyan');
  log(`Node.js: ${process.version}`, 'cyan');
  log(`Mode: ${applyFixes ? 'Diagnose & Fix' : 'Diagnose Only'}`, 'cyan');

  const results = {
    passed: 0,
    warnings: 0,
    fixed: 0,
    failed: 0,
  };

  logSection('Running Diagnostics');

  const checks = [
    { name: 'Node Modules', fn: errorDetectors.checkNodeModules },
    { name: 'Environment', fn: errorDetectors.checkEnvFile },
    { name: 'Build', fn: errorDetectors.checkBuild },
    { name: 'Data Dirs', fn: errorDetectors.checkDataDirs },
    { name: 'Port', fn: errorDetectors.checkPort },
    { name: 'Browser', fn: errorDetectors.checkBrowser },
    { name: 'TypeScript', fn: errorDetectors.checkTsConfig },
    { name: 'Permissions', fn: errorDetectors.checkPermissions },
    { name: 'Memory', fn: errorDetectors.checkMemory },
  ];

  for (const check of checks) {
    process.stdout.write(`  [${check.name}] `);

    try {
      const result = await Promise.resolve(check.fn());

      if (result.ok) {
        log('OK', 'green');
        results.passed++;
      } else if (result.warning) {
        log(`WARNING: ${result.warning}`, 'yellow');
        results.warnings++;
      } else if (result.error) {
        log(`ERROR: ${result.error}`, 'red');

        if (applyFixes && result.fix && fixes[result.fix]) {
          const fixed = fixes[result.fix]();
          if (fixed) {
            results.fixed++;
          } else {
            results.failed++;
          }
        } else {
          results.failed++;
        }
      }
    } catch (e) {
      log(`ERROR: ${e.message}`, 'red');
      results.failed++;
    }
  }

  // Summary
  logSection('Summary');
  log(`  Passed:   ${results.passed}`, 'green');
  log(`  Warnings: ${results.warnings}`, 'yellow');
  log(`  Fixed:    ${results.fixed}`, 'cyan');
  log(`  Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  if (results.failed === 0) {
    console.log('');
    log('  ✓ All systems operational!', 'green');
    console.log('');
  } else {
    console.log('');
    log('  Some issues could not be auto-fixed.', 'yellow');
    log('  Please check the errors above and fix manually.', 'yellow');
    console.log('');
  }

  return results.failed === 0;
}

async function watchMode() {
  log('Starting watch mode (Ctrl+C to exit)...', 'cyan');

  let lastCheck = Date.now();
  const checkInterval = 30000; // 30 seconds

  // Initial check
  await runDiagnostics(true);

  // Watch for changes
  const watcher = setInterval(async () => {
    const now = Date.now();
    if (now - lastCheck >= checkInterval) {
      console.clear();
      log(`[${new Date().toLocaleTimeString()}] Running periodic check...`, 'cyan');
      await runDiagnostics(true);
      lastCheck = now;
    }
  }, 5000);

  // Handle exit
  process.on('SIGINT', () => {
    clearInterval(watcher);
    log('\nWatch mode stopped.', 'cyan');
    process.exit(0);
  });
}

// ============================================================================
// ENTRY POINT
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--watch')) {
  watchMode();
} else if (args.includes('--check')) {
  runDiagnostics(false).then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  runDiagnostics(true).then(success => {
    process.exit(success ? 0 : 1);
  });
}
