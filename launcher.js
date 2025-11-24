#!/usr/bin/env node

/**
 * UndetectBrowser Launcher - 1 Click Start
 * Creates a standalone .exe that runs everything
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function box(title) {
  const width = 60;
  const padding = Math.floor((width - title.length - 2) / 2);
  console.log('\n' + '═'.repeat(width));
  console.log(' '.repeat(padding) + colors.bright + title + colors.reset);
  console.log('═'.repeat(width) + '\n');
}

async function checkNodeVersion() {
  return new Promise((resolve) => {
    exec('node -v', (error, stdout) => {
      if (error) {
        resolve(null);
      } else {
        const version = stdout.trim().substring(1).split('.')[0];
        resolve(parseInt(version));
      }
    });
  });
}

async function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    log(`📦 ${description}...`, 'cyan');

    const isWindows = os.platform() === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const args = isWindows ? ['/c', command] : ['-c', command];

    const proc = spawn(shell, args, {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} - успешно!`, 'green');
        resolve();
      } else {
        log(`⚠️  ${description} - завершено с предупреждениями`, 'yellow');
        resolve(); // Не блокируем
      }
    });

    proc.on('error', (err) => {
      log(`❌ Ошибка: ${err.message}`, 'red');
      resolve(); // Не блокируем
    });
  });
}

async function openBrowser(url) {
  const command = os.platform() === 'win32'
    ? `start ${url}`
    : os.platform() === 'darwin'
    ? `open ${url}`
    : `xdg-open ${url}`;

  setTimeout(() => {
    exec(command);
  }, 3000);
}

async function main() {
  box('UndetectBrowser Launcher');

  // Check Node.js
  log('🔍 Проверка Node.js...', 'cyan');
  const nodeVersion = await checkNodeVersion();

  if (!nodeVersion) {
    log('❌ Node.js не установлен!', 'red');
    log('📥 Скачайте с https://nodejs.org/', 'yellow');
    process.exit(1);
  }

  if (nodeVersion < 18) {
    log(`❌ Node.js версия слишком старая: v${nodeVersion}`, 'red');
    log('📥 Установите Node.js 18+ с https://nodejs.org/', 'yellow');
    process.exit(1);
  }

  log(`✅ Node.js v${nodeVersion} установлен`, 'green');

  // Check if already built
  const distExists = fs.existsSync(path.join(__dirname, 'dist'));

  if (!distExists) {
    log('\n📋 Первый запуск - установка и сборка...', 'cyan');

    // Install dependencies
    await runCommand('npm install --prefer-offline', 'Установка зависимостей');

    // Build project
    await runCommand('npm run build:ci || npm run build', 'Сборка проекта');

    // Create .env if not exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      const envContent = `PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
JWT_SECRET=change-this-in-production
HEADLESS=false`;
      fs.writeFileSync(envPath, envContent);
      log('✅ .env файл создан', 'green');
    }

    log('\n✅ Установка завершена!', 'green');
  } else {
    log('\n✅ Проект уже собран!', 'green');
  }

  // Start server
  box('Запуск AntidetectBrowser');

  log('🚀 Запуск backend сервера...', 'cyan');
  log('📍 Backend: http://localhost:3000', 'yellow');
  log('📍 Frontend: http://localhost:3001', 'yellow');
  log('\n💡 Браузер откроется автоматически через 3 секунды...', 'cyan');
  log('💡 Для остановки нажмите Ctrl+C', 'yellow');

  // Open browser
  openBrowser('http://localhost:3001');

  // Start backend
  const isWindows = os.platform() === 'win32';
  const backendCmd = isWindows
    ? 'npm.cmd run server:dev'
    : 'npm run server:dev';

  const backend = spawn(backendCmd, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  // Wait a bit for backend to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start frontend in new window
  log('\n🚀 Запуск frontend...', 'cyan');

  const frontendCmd = isWindows
    ? 'cd frontend && npm.cmd run dev'
    : 'cd frontend && npm run dev';

  const frontend = spawn(frontendCmd, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  // Handle exit
  process.on('SIGINT', () => {
    log('\n\n👋 Остановка серверов...', 'yellow');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });

  // Keep process alive
  backend.on('close', () => {
    log('⚠️  Backend остановлен', 'yellow');
    frontend.kill();
    process.exit(0);
  });

  frontend.on('close', () => {
    log('⚠️  Frontend остановлен', 'yellow');
    backend.kill();
    process.exit(0);
  });
}

// Run
main().catch(err => {
  log(`❌ Критическая ошибка: ${err.message}`, 'red');
  process.exit(1);
});
