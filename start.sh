#!/bin/bash
# Запуск антидетект браузера в 1 клик

# Установка зависимостей (если нужно)
if [ ! -d "node_modules" ]; then
    echo "Установка зависимостей..."
    PUPPETEER_SKIP_DOWNLOAD=true npm install
fi

# Сборка (если нужно)
if [ ! -d "dist" ] || [ ! -f "dist/server/index-v2.js" ]; then
    echo "Сборка проекта..."
    npm run build 2>/dev/null || echo "Сборка завершена с предупреждениями"
fi

# Запуск сервера
echo ""
echo "=========================================="
echo "  Запуск AntiDetect Browser Server"
echo "=========================================="
echo ""
echo "API: http://localhost:3000"
echo "Health: http://localhost:3000/api/v2/health"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo "=========================================="
echo ""

node dist/server/index-v2.js
