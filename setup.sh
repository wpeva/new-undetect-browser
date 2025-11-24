#!/bin/bash

# ═══════════════════════════════════════════════════════
# UndetectBrowser - Полная установка (1 клик)
# ═══════════════════════════════════════════════════════

set -e  # Остановка при ошибке

echo "═══════════════════════════════════════════════════════"
echo "  🚀 UndetectBrowser - Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Проверка Node.js
echo "📋 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "📥 Установите Node.js 18+ с https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js версия слишком старая: $(node -v)"
    echo "📥 Установите Node.js 18+ с https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) установлен"

# Проверка npm
echo "📋 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен!"
    exit 1
fi
echo "✅ npm $(npm -v) установлен"

# Установка зависимостей backend
echo ""
echo "📦 Установка backend зависимостей..."
npm install --prefer-offline

# Установка зависимостей frontend
echo ""
echo "📦 Установка frontend зависимостей..."
cd frontend
npm install --prefer-offline
cd ..

# Сборка проекта
echo ""
echo "🔨 Сборка проекта..."
npm run build:ci 2>/dev/null || npm run build

# Создание .env файла
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  Создание .env файла..."
    cat > .env << 'EOF'
# UndetectBrowser Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
JWT_SECRET=change-this-to-secure-random-string
JWT_EXPIRES_IN=24h
PUPPETEER_SKIP_DOWNLOAD=false
HEADLESS=false
LOG_LEVEL=info
EOF
    echo "✅ .env файл создан"
fi

# Создание директорий
echo ""
echo "📁 Создание директорий..."
mkdir -p profiles logs data .cache
echo "✅ Директории созданы"

# Сделать скрипты исполняемыми
chmod +x start.sh 2>/dev/null || true
chmod +x launch-browser.js 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Установка завершена!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🚀 Запустите антидетект браузер:"
echo ""
echo "   ./start.sh"
echo ""
echo "Или запустите вручную:"
echo "   npm run server:dev    # Backend"
echo "   cd frontend && npm run dev    # Frontend"
echo ""
echo "Откройте в браузере: http://localhost:3001"
echo "═══════════════════════════════════════════════════════"
