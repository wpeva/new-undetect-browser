#!/bin/bash
##############################################################################
#
#  UndetectBrowser - Professional Auto-Installer
#  Version: 1.0.0
#
#  Автоматическая установка и настройка UndetectBrowser
#  Работает на Linux, macOS, и Windows (Git Bash/WSL)
#
##############################################################################

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функции вывода
print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║          UndetectBrowser - Professional Installer              ║"
    echo "║                      Version 1.0.0                             ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_step() {
    echo -e "${CYAN}[$1/$2] $3${NC}"
}

# Проверка Node.js
check_nodejs() {
    print_step 1 7 "Проверка Node.js..."

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js установлен: $NODE_VERSION"

        # Проверка версии (нужен 18+)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "Требуется Node.js 18 или выше (текущая: $NODE_VERSION)"
            print_info "Скачайте с: https://nodejs.org/"
            return 1
        fi
        return 0
    else
        print_error "Node.js не найден!"
        print_info "Установите Node.js 20+ с https://nodejs.org/"

        # Автоматическая установка для Linux
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            print_info "Попытка автоматической установки через nvm..."
            install_nodejs_linux
            return $?
        fi
        return 1
    fi
}

# Установка Node.js через nvm (Linux)
install_nodejs_linux() {
    if command -v curl &> /dev/null; then
        print_info "Устанавливаем nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

        # Загружаем nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        # Устанавливаем Node.js 20
        nvm install 20
        nvm use 20

        if command -v node &> /dev/null; then
            print_success "Node.js успешно установлен!"
            return 0
        fi
    fi
    return 1
}

# Проверка npm
check_npm() {
    print_step 2 7 "Проверка npm..."

    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm установлен: $NPM_VERSION"
        return 0
    else
        print_error "npm не найден!"
        return 1
    fi
}

# Проверка git
check_git() {
    print_step 3 7 "Проверка git..."

    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "git установлен: $GIT_VERSION"
        return 0
    else
        print_warning "git не найден (не обязателен для работы)"
        return 0
    fi
}

# Установка зависимостей
install_dependencies() {
    print_step 4 7 "Установка зависимостей..."

    # Создаем директорию для логов
    mkdir -p logs
    LOG_FILE="logs/install-$(date +%Y%m%d-%H%M%S).log"

    print_info "Установка может занять 3-5 минут..."
    print_info "Логи сохраняются в: $LOG_FILE"

    # Backend зависимости
    echo -e "\n${BLUE}Устанавливаем backend зависимости...${NC}"
    if npm install --legacy-peer-deps >> "$LOG_FILE" 2>&1; then
        print_success "Backend зависимости установлены"
    else
        print_error "Ошибка установки backend зависимостей"
        print_info "Проверьте логи: $LOG_FILE"
        return 1
    fi

    # Frontend зависимости
    if [ -d "frontend" ]; then
        echo -e "\n${BLUE}Устанавливаем frontend зависимости...${NC}"
        cd frontend
        if npm install >> "../$LOG_FILE" 2>&1; then
            print_success "Frontend зависимости установлены"
            cd ..
        else
            print_error "Ошибка установки frontend зависимостей"
            cd ..
            return 1
        fi
    fi

    return 0
}

# Компиляция TypeScript
compile_typescript() {
    print_step 5 7 "Компиляция TypeScript..."

    LOG_FILE="logs/build-$(date +%Y%m%d-%H%M%S).log"

    if npm run build:safe >> "$LOG_FILE" 2>&1; then
        print_success "TypeScript успешно скомпилирован"
        return 0
    else
        print_warning "Есть ошибки компиляции, но продолжаем..."
        return 0
    fi
}

# Создание .env файла
create_env_file() {
    print_step 6 7 "Создание конфигурационного файла..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Создан .env файл из .env.example"
        else
            # Создаем базовый .env
            cat > .env << 'EOF'
# UndetectBrowser Configuration
NODE_ENV=production
PORT=3000
FRONTEND_PORT=3001

# Security
SESSION_SECRET=change_this_in_production_$(openssl rand -hex 32)

# Browser Settings
HEADLESS=false
ENABLE_STEALTH=true

# Logging
LOG_LEVEL=info
EOF
            print_success "Создан базовый .env файл"
        fi
    else
        print_info ".env файл уже существует, пропускаем"
    fi

    return 0
}

# Проверка установки
verify_installation() {
    print_step 7 7 "Проверка установки..."

    ERRORS=0

    # Проверяем node_modules
    if [ -d "node_modules" ]; then
        print_success "node_modules существует"
    else
        print_error "node_modules не найдена"
        ((ERRORS++))
    fi

    # Проверяем dist
    if [ -d "dist" ]; then
        print_success "Проект скомпилирован (dist/ существует)"
    else
        print_warning "dist/ не найдена, возможно нужна пересборка"
    fi

    # Проверяем .env
    if [ -f ".env" ]; then
        print_success ".env файл существует"
    else
        print_error ".env файл не создан"
        ((ERRORS++))
    fi

    # Проверяем ключевые файлы
    if [ -f "package.json" ]; then
        print_success "package.json найден"
    else
        print_error "package.json не найден!"
        ((ERRORS++))
    fi

    if [ $ERRORS -gt 0 ]; then
        print_error "Установка завершилась с $ERRORS ошибками"
        return 1
    else
        print_success "Все проверки пройдены!"
        return 0
    fi
}

# Создание скриптов запуска
create_launch_scripts() {
    echo -e "\n${CYAN}Создание скриптов запуска...${NC}"

    # Скрипт запуска сервера
    cat > start-server.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting UndetectBrowser Server..."
npm run server:v2
EOF
    chmod +x start-server.sh
    print_success "Создан start-server.sh"

    # Скрипт запуска с веб-интерфейсом
    cat > start-web.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting UndetectBrowser Web Interface..."

# Запускаем сервер в фоне
npm run server:v2 &
SERVER_PID=$!

# Ждем запуска сервера
sleep 3

# Запускаем frontend
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "Server PID: $SERVER_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Open in browser: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both services"

# Обработка Ctrl+C
trap "kill $SERVER_PID $FRONTEND_PID; exit" INT

# Ждем
wait
EOF
    chmod +x start-web.sh
    print_success "Создан start-web.sh"

    # Универсальный лаунчер
    cat > start-undetect.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"

echo "╔════════════════════════════════════════╗"
echo "║   UndetectBrowser - Quick Start        ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Выберите режим запуска:"
echo ""
echo "1) Только сервер (API)"
echo "2) Веб-интерфейс (Server + Frontend)"
echo "3) Desktop приложение (Electron)"
echo "4) Выход"
echo ""
read -p "Выберите опцию [1-4]: " choice

case $choice in
    1)
        echo "Запуск сервера..."
        npm run server:v2
        ;;
    2)
        echo "Запуск веб-интерфейса..."
        ./start-web.sh
        ;;
    3)
        echo "Запуск Electron приложения..."
        npm run electron
        ;;
    4)
        echo "До свидания!"
        exit 0
        ;;
    *)
        echo "Неверный выбор!"
        exit 1
        ;;
esac
EOF
    chmod +x start-undetect.sh
    print_success "Создан start-undetect.sh (главный лаунчер)"
}

# Показать итоги
show_summary() {
    echo -e "\n${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║              ✓ Установка завершена успешно!                   ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${CYAN}Быстрый запуск:${NC}"
    echo -e "  ${GREEN}./start-undetect.sh${NC}     - Интерактивное меню"
    echo -e "  ${GREEN}./start-server.sh${NC}       - Только API сервер"
    echo -e "  ${GREEN}./start-web.sh${NC}          - Веб-интерфейс"
    echo ""

    echo -e "${CYAN}Или запустите вручную:${NC}"
    echo -e "  ${BLUE}npm run server:v2${NC}       - Запуск сервера"
    echo -e "  ${BLUE}npm run electron${NC}        - Запуск Electron"
    echo ""

    echo -e "${CYAN}Адреса:${NC}"
    echo -e "  API:       ${GREEN}http://localhost:3000${NC}"
    echo -e "  Web UI:    ${GREEN}http://localhost:3001${NC}"
    echo ""

    echo -e "${CYAN}Полезные команды:${NC}"
    echo -e "  ${BLUE}npm run test${NC}            - Запуск тестов"
    echo -e "  ${BLUE}npm run fix${NC}             - Автоисправление проблем"
    echo -e "  ${BLUE}npm run health${NC}          - Проверка здоровья системы"
    echo ""

    echo -e "${YELLOW}Документация:${NC}"
    echo -e "  README.md, ONE_CLICK_SETUP.md, QUICK_START_RU.md"
    echo ""
}

# Главная функция
main() {
    print_header

    echo -e "${BLUE}Начинаем установку UndetectBrowser...${NC}\n"

    # Проверки
    if ! check_nodejs; then
        print_error "Установка прервана: требуется Node.js 18+"
        exit 1
    fi

    if ! check_npm; then
        print_error "Установка прервана: требуется npm"
        exit 1
    fi

    check_git

    # Установка
    if ! install_dependencies; then
        print_error "Ошибка установки зависимостей"
        exit 1
    fi

    if ! compile_typescript; then
        print_warning "Компиляция завершилась с предупреждениями"
    fi

    if ! create_env_file; then
        print_warning "Не удалось создать .env файл"
    fi

    # Создаем скрипты запуска
    create_launch_scripts

    # Проверка
    if ! verify_installation; then
        print_warning "Проверка выявила проблемы, но установка может работать"
    fi

    # Итоги
    show_summary

    # Предложение запустить
    echo -e "${YELLOW}Запустить сейчас? [y/N]${NC} "
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "\n${GREEN}Запускаем UndetectBrowser...${NC}\n"
        ./start-undetect.sh
    else
        echo -e "\n${CYAN}Для запуска используйте: ${GREEN}./start-undetect.sh${NC}\n"
    fi
}

# Обработка Ctrl+C
trap "echo -e '\n${RED}Установка прервана пользователем${NC}'; exit 1" INT

# Запуск
main "$@"
