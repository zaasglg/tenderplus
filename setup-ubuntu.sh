#!/bin/bash

# Скрипт установки Laravel проекта TenderPlus на Ubuntu
# Автор: GitHub Copilot
# Дата: 2025-11-18

set -e  # Остановить выполнение при ошибке

# Настройки проекта
PROJECT_DIR="/var/www/tenderplus"
PROJECT_USER="www-data"
DOMAIN="superchem.shop"

echo "================================================"
echo "  Установка Laravel проекта TenderPlus"
echo "================================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода с цветом
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Проверка прав sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Запустите скрипт от имени root или с sudo"
    exit 1
fi

# Обновление системы
print_info "Обновление списка пакетов..."
apt update -qq

# Установка необходимых пакетов
print_info "Установка базовых пакетов..."
apt install -y -qq software-properties-common curl git unzip supervisor > /dev/null 2>&1
print_success "Базовые пакеты установлены"

# Проверка PHP
print_info "Проверка PHP..."
if command -v php &> /dev/null; then
    PHP_VERSION=$(php -r 'echo PHP_VERSION;')
    print_success "PHP уже установлен ($PHP_VERSION)"
    
    # Проверка необходимых расширений
    print_info "Проверка расширений PHP..."
    REQUIRED_EXTENSIONS="mysql xml mbstring curl zip bcmath gd intl"
    MISSING_EXTENSIONS=""
    
    for ext in $REQUIRED_EXTENSIONS; do
        if ! php -m | grep -q "^$ext$"; then
            MISSING_EXTENSIONS="$MISSING_EXTENSIONS php-$ext"
        fi
    done
    
    if [ ! -z "$MISSING_EXTENSIONS" ]; then
        print_info "Установка недостающих расширений:$MISSING_EXTENSIONS"
        apt install -y -qq $MISSING_EXTENSIONS > /dev/null 2>&1
        print_success "Расширения установлены"
    else
        print_success "Все необходимые расширения PHP установлены"
    fi
else
    print_error "PHP не установлен"
    exit 1
fi

# Установка Composer
print_info "Установка Composer..."
if ! command -v composer &> /dev/null; then
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
    chmod +x /usr/local/bin/composer
    print_success "Composer установлен"
else
    print_success "Composer уже установлен ($(composer --version | cut -d ' ' -f 3))"
fi

# Установка Node.js 20.x
print_info "Установка Node.js 20.x..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt install -y -qq nodejs > /dev/null 2>&1
    print_success "Node.js установлен ($(node -v))"
else
    print_success "Node.js уже установлен ($(node -v))"
fi

# Установка MySQL
print_info "Установка MySQL..."
if ! command -v mysql &> /dev/null; then
    apt install -y -qq mysql-server > /dev/null 2>&1
    systemctl start mysql
    systemctl enable mysql > /dev/null 2>&1
    print_success "MySQL установлен"
else
    print_success "MySQL уже установлен"
fi

# Проверка директории проекта
print_info "Проверка директории проекта..."
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Директория $PROJECT_DIR не существует!"
    print_error "Склонируйте проект в /var/www/ используя git:"
    echo ""
    echo "  cd /var/www"
    echo "  git clone YOUR_REPO_URL tenderplus"
    echo ""
    exit 1
fi

if [ ! -f "$PROJECT_DIR/artisan" ]; then
    print_error "Laravel проект не найден в $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR
print_success "Проект найден: $PROJECT_DIR"

# Настройка базы данных
print_info "Настройка базы данных..."
DB_NAME="tenderplus"
DB_USER="tenderplus"
DB_PASS="tenderplus_$(openssl rand -hex 4)"

mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null || true
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';" 2>/dev/null || true
mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true
print_success "База данных настроена"

# Создание .env файла
print_info "Настройка .env файла..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success ".env файл создан"
    else
        print_error ".env.example не найден"
        exit 1
    fi
else
    print_success ".env файл уже существует"
fi

# Обновление настроек БД в .env
sed -i "s/DB_DATABASE=.*/DB_DATABASE=${DB_NAME}/" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USER}/" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASS}/" .env

# Установка зависимостей PHP
print_info "Установка зависимостей PHP (это может занять несколько минут)..."
composer install --no-interaction --prefer-dist --optimize-autoloader > /dev/null 2>&1
print_success "Зависимости PHP установлены"

# Генерация ключа приложения
print_info "Генерация ключа приложения..."
php artisan key:generate --force > /dev/null 2>&1
print_success "Ключ приложения сгенерирован"

# Установка зависимостей JavaScript
print_info "Установка зависимостей JavaScript (это может занять несколько минут)..."
npm install --silent > /dev/null 2>&1
print_success "Зависимости JavaScript установлены"

# Настройка прав доступа
print_info "Настройка прав доступа..."
chown -R $PROJECT_USER:$PROJECT_USER $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
chmod -R 775 $PROJECT_DIR/storage
chmod -R 775 $PROJECT_DIR/bootstrap/cache
print_success "Права доступа настроены"

# Запуск миграций
print_info "Запуск миграций базы данных..."
php artisan migrate --force > /dev/null 2>&1
print_success "Миграции выполнены"

# Сборка фронтенда
print_info "Сборка фронтенда..."
npm run build > /dev/null 2>&1
print_success "Фронтенд собран"

# Настройка Supervisor для Laravel Queue
print_info "Настройка Supervisor для Queue Worker..."
cat > /etc/supervisor/conf.d/tenderplus-worker.conf << EOF
[program:tenderplus-worker]
process_name=%(program_name)s_%(process_num)02d
command=php $PROJECT_DIR/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=$PROJECT_USER
numprocs=1
redirect_stderr=true
stdout_logfile=$PROJECT_DIR/storage/logs/worker.log
stopwaitsecs=3600
EOF
print_success "Supervisor для Worker настроен"

# Настройка Supervisor для Telegram бота
print_info "Настройка Supervisor для Telegram бота..."
cat > /etc/supervisor/conf.d/tenderplus-bot.conf << EOF
[program:tenderplus-bot]
process_name=%(program_name)s
command=php $PROJECT_DIR/artisan telegram:polling
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=$PROJECT_USER
redirect_stderr=true
stdout_logfile=$PROJECT_DIR/storage/logs/telegram-bot.log
stopwaitsecs=10
EOF
print_success "Supervisor для Telegram бота настроен"

# Перезапуск Supervisor
print_info "Перезапуск Supervisor..."
supervisorctl reread > /dev/null 2>&1
supervisorctl update > /dev/null 2>&1
supervisorctl start tenderplus-worker:* > /dev/null 2>&1
supervisorctl start tenderplus-bot > /dev/null 2>&1
print_success "Supervisor запущен"

# Установка и настройка Nginx
print_info "Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y -qq nginx > /dev/null 2>&1
    print_success "Nginx установлен"
else
    print_success "Nginx уже установлен"
fi

# Настройка Nginx для домена
print_info "Настройка Nginx для $DOMAIN..."
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name superchem.shop www.superchem.shop;
    root /var/www/tenderplus/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
EOF

# Включение сайта
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
nginx -t > /dev/null 2>&1
systemctl restart nginx
systemctl enable nginx > /dev/null 2>&1
print_success "Nginx настроен для $DOMAIN"

# Установка Certbot для SSL (опционально)
print_info "Установка Certbot для SSL..."
if ! command -v certbot &> /dev/null; then
    apt install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
    print_success "Certbot установлен"
    echo ""
    print_info "Для установки SSL сертификата выполните:"
    echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    echo ""
else
    print_success "Certbot уже установлен"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ Установка завершена успешно!${NC}"
echo "================================================"
echo ""
echo "Данные для подключения к базе данных:"
echo "  База данных: ${DB_NAME}"
echo "  Пользователь: ${DB_USER}"
echo "  Пароль: ${DB_PASS}"
echo ""
echo "Проект установлен в: $PROJECT_DIR"
echo ""
echo "Запущенные сервисы:"
echo "  ✓ Nginx Web Server"
echo "  ✓ Queue Worker (supervisor)"
echo "  ✓ Telegram Bot (supervisor)"
echo ""
echo "Проект доступен по адресу: http://$DOMAIN"
echo ""
echo "Управление сервисами:"
echo ""
echo "  # Nginx"
echo "  systemctl status nginx"
echo "  systemctl restart nginx"
echo "  nginx -t  # Проверка конфигурации"
echo ""
echo "  # Queue Worker"
echo "  supervisorctl status tenderplus-worker:*"
echo "  supervisorctl restart tenderplus-worker:*"
echo ""
echo "  # Telegram Bot"
echo "  supervisorctl status tenderplus-bot"
echo "  supervisorctl restart tenderplus-bot"
echo ""
echo "Логи:"
echo "  Nginx Access: tail -f /var/log/nginx/access.log"
echo "  Nginx Error: tail -f /var/log/nginx/error.log"
echo "  Laravel: tail -f $PROJECT_DIR/storage/logs/laravel.log"
echo "  Worker: tail -f $PROJECT_DIR/storage/logs/worker.log"
echo "  Bot: tail -f $PROJECT_DIR/storage/logs/telegram-bot.log"
echo ""
echo "⚠️  ВАЖНО:"
echo "  1. Настройте DNS для $DOMAIN -> IP сервера"
echo "  2. Настройте TELEGRAM_BOT_TOKEN в файле $PROJECT_DIR/.env"
echo "  3. После настройки перезапустите бота: supervisorctl restart tenderplus-bot"
echo "  4. Установите SSL сертификат: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
print_info "Сохраните пароль базы данных в надежном месте!"
echo ""
