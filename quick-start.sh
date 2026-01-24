#!/bin/bash

# ============================================
# UndetectBrowser - Quick Start Script
# Быстрая установка и запуск для Mac/Linux
# ============================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для печати заголовка
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║                                                    ║"
    echo "║         UndetectBrowser - Quick Start              ║"
    echo "║                                                    ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Функция для печати успеха
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для печати ошибки
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Функция для печати информации
print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Проверка Node.js
check_node() {
    print_info "Проверка Node.js..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js не установлен!"
        echo ""
        echo "Установите Node.js 20+ с https://nodejs.org"
        echo ""
        echo "Или используйте nvm (рекомендуется):"
        echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "  source ~/.bashrc"
        echo "  nvm install 20"
        echo "  nvm use 20"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js версия слишком старая: $(node -v)"
        print_error "Требуется версия 20 или выше"
        exit 1
    fi

    print_success "Node.js $(node -v) установлен"
}

# Проверка npm
check_npm() {
    print_info "Проверка npm..."
    if ! command -v npm &> /dev/null; then
        print_error "npm не установлен!"
        exit 1
    fi
    print_success "npm $(npm -v) установлен"
}

# Установка зависимостей
install_dependencies() {
    print_info "Установка зависимостей..."

    # Backend
    echo ""
    echo "📦 Установка зависимостей backend..."
    npm install
    print_success "Backend зависимости установлены"

    # Frontend
    echo ""
    echo "📦 Установка зависимостей frontend..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend зависимости установлены"
}

# Компиляция TypeScript
build_project() {
    print_info "Компиляция TypeScript..."
    npm run build
    print_success "Проект скомпилирован"
}

# Создание .env файла если не существует
setup_env() {
    if [ ! -f .env ]; then
        print_info "Создание .env файла..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success ".env файл создан из .env.example"
        else
            cat > .env << EOF
# Основные настройки
NODE_ENV=development
PORT=3000
HOST=localhost

# Безопасность
JWT_SECRET=$(openssl rand -base64 32)
ENABLE_AUTH=false

# CORS
CORS_ORIGIN=http://localhost:3001

# Browser
BROWSER_HEADLESS=false
MAX_CONCURRENT_SESSIONS=10

# Логирование
LOG_LEVEL=info
REQUEST_LOGGING=true
EOF
            print_success ".env файл создан"
        fi
    else
        print_success ".env файл уже существует"
    fi
}

# Меню выбора
show_menu() {
    echo ""
    echo -e "${BLUE}Выберите режим запуска:${NC}"
    echo ""
    echo "1) Web Interface (Рекомендуется)"
    echo "   - Backend API:  http://localhost:3000"
    echo "   - Frontend UI:  http://localhost:3001"
    echo ""
    echo "2) Desktop App (Electron)"
    echo "   - Standalone приложение"
    echo ""
    echo "3) Docker (Полный стек)"
    echo "   - Все сервисы в контейнерах"
    echo ""
    echo "4) Только установка (без запуска)"
    echo ""
    echo -n "Введите номер (1-4): "
    read -r choice
    echo ""

    case $choice in
        1)
            start_web_interface
            ;;
        2)
            start_electron
            ;;
        3)
            start_docker
            ;;
        4)
            print_success "Установка завершена!"
            print_info "Для запуска используйте:"
            echo "  ./quick-start.sh"
            ;;
        *)
            print_error "Неверный выбор"
            exit 1
            ;;
    esac
}

# Запуск Web Interface
start_web_interface() {
    print_info "Запуск Web Interface..."

    # Проверка если порты заняты
    check_port 3000
    check_port 3001

    echo ""
    print_success "Запуск серверов..."
    echo ""
    print_info "Backend будет доступен на:  http://localhost:3000"
    print_info "Frontend будет доступен на: http://localhost:3001"
    echo ""
    print_info "Для доступа с телефона в локальной сети:"
    LOCAL_IP=$(get_local_ip)
    if [ ! -z "$LOCAL_IP" ]; then
        print_info "  http://$LOCAL_IP:3001"
    fi
    echo ""
    print_info "Нажмите Ctrl+C для остановки"
    echo ""

    # Запуск в фоне и ожидание
    trap 'kill $(jobs -p) 2>/dev/null' EXIT

    # Backend
    npm run server &
    BACKEND_PID=$!

    # Ожидание запуска backend
    sleep 5

    # Frontend
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    # Ожидание запуска frontend
    sleep 5

    # Открыть браузер
    open_browser "http://localhost:3001"

    # Ожидание
    wait
}

# Запуск Electron
start_electron() {
    print_info "Запуск Desktop приложения..."
    npm run electron:dev
}

# Запуск Docker
start_docker() {
    print_info "Проверка Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен!"
        echo ""
        echo "Установите Docker Desktop:"
        echo "  macOS:  https://docs.docker.com/desktop/install/mac-install/"
        echo "  Linux:  https://docs.docker.com/desktop/install/linux-install/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker не запущен!"
        print_info "Запустите Docker Desktop и попробуйте снова"
        exit 1
    fi

    print_success "Docker готов"
    print_info "Запуск контейнеров..."
    echo ""

    docker-compose up
}

# Проверка занятости порта
check_port() {
    PORT=$1
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "Порт $PORT уже занят!"
        echo ""
        echo "Освободите порт или убейте процесс:"
        echo "  lsof -ti:$PORT | xargs kill -9"
        echo ""
        exit 1
    fi
}

# Получение локального IP
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null
    else
        # Linux
        hostname -I | awk '{print $1}'
    fi
}

# Открыть браузер
open_browser() {
    URL=$1
    sleep 3  # Даем время на запуск

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$URL" 2>/dev/null || true
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "$URL" 2>/dev/null || true
    fi
}

# ============================================
# Главная функция
# ============================================
main() {
    print_header

    # Проверки
    check_node
    check_npm

    echo ""

    # Проверяем, установлены ли зависимости
    if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ]; then
        print_info "Первый запуск - установка зависимостей..."
        echo ""
        install_dependencies
        build_project
        setup_env
        echo ""
        print_success "Установка завершена!"
    else
        # Проверяем, есть ли dist папка
        if [ ! -d "dist" ]; then
            print_info "Компиляция проекта..."
            build_project
        fi
        setup_env
    fi

    # Показать меню
    show_menu
}

# Запуск
main
