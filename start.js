#!/usr/bin/env node
/**
 * UndetectBrowser - Simple Start Script
 * Запускает backend сервер и frontend одной командой
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = __dirname;
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50));
}

// Check if dist exists
function checkBuild() {
  const serverFile = path.join(ROOT_DIR, 'dist', 'server', 'index-v2.js');
  if (!fs.existsSync(serverFile)) {
    log('Backend not built. Building...', 'yellow');
    return new Promise((resolve, reject) => {
      exec('npm run build', { cwd: ROOT_DIR }, (err, stdout, stderr) => {
        if (err) {
          log('Build failed!', 'red');
          console.error(stderr);
          reject(err);
        } else {
          log('Build successful!', 'green');
          resolve();
        }
      });
    });
  }
  return Promise.resolve();
}

// Check frontend dependencies
function checkFrontendDeps() {
  const nodeModules = path.join(FRONTEND_DIR, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    log('Frontend dependencies not installed. Installing...', 'yellow');
    return new Promise((resolve, reject) => {
      exec('npm install', { cwd: FRONTEND_DIR }, (err, stdout, stderr) => {
        if (err) {
          log('Frontend install failed!', 'red');
          console.error(stderr);
          reject(err);
        } else {
          log('Frontend dependencies installed!', 'green');
          resolve();
        }
      });
    });
  }
  return Promise.resolve();
}

// Start backend server
function startBackend() {
  logSection('Starting Backend Server (port 3000)');

  const backend = spawn('node', ['dist/server/index-v2.js'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' }
  });

  backend.on('error', (err) => {
    log(`Backend error: ${err.message}`, 'red');
  });

  backend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`Backend exited with code ${code}`, 'red');
    }
  });

  return backend;
}

// Start frontend dev server
function startFrontend() {
  logSection('Starting Frontend (port 3001)');

  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (err) => {
    log(`Frontend error: ${err.message}`, 'red');
  });

  return frontend;
}

// Main
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         UndetectBrowser - Starting...                ║
╚══════════════════════════════════════════════════════╝
  `);

  try {
    // Check and build if needed
    await checkBuild();
    await checkFrontendDeps();

    // Start servers
    const backend = startBackend();

    // Wait a bit for backend to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    const frontend = startFrontend();

    // Handle shutdown
    const shutdown = () => {
      log('\nShutting down...', 'yellow');
      backend.kill();
      frontend.kill();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Wait for both processes
    await new Promise(() => {}); // Keep running

  } catch (error) {
    log(`Startup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
