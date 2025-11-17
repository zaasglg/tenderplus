# Инструкция по запуску проекта на Ubuntu

## Требования
- Ubuntu 20.04 или выше
- Права sudo

## Автоматическая установка

Запустите скрипт установки:

```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

Скрипт автоматически установит и настроит:
- PHP 8.2 и необходимые расширения
- Composer
- Node.js 20.x и npm
- MySQL 8.0
- Настроит проект и базу данных

## Ручная установка

### 1. Установка PHP 8.2

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip php8.2-bcmath php8.2-gd php8.2-intl
```

### 2. Установка Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### 3. Установка Node.js и npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4. Установка MySQL

```bash
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 5. Настройка MySQL

```bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS tenderplus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'tenderplus'@'localhost' IDENTIFIED BY 'password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON tenderplus.* TO 'tenderplus'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 6. Настройка проекта

```bash
# Копировать .env файл
cp .env.example .env

# Установить зависимости PHP
composer install

# Установить зависимости JavaScript
npm install

# Сгенерировать ключ приложения
php artisan key:generate

# Запустить миграции
php artisan migrate

# Собрать фронтенд
npm run build
```

### 7. Настройка .env

Отредактируйте файл `.env` и укажите настройки базы данных:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tenderplus
DB_USERNAME=tenderplus
DB_PASSWORD=password

TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## Запуск проекта

### Режим разработки

```bash
# В первом терминале - Laravel сервер
php artisan serve

# Во втором терминале - Vite dev server
npm run dev

# В третьем терминале - Queue worker (опционально)
php artisan queue:work
```

Проект будет доступен по адресу: http://localhost:8000

### Производственный режим

```bash
# Оптимизация
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Сборка фронтенда
npm run build

# Настройка веб-сервера (Nginx или Apache)
# См. документацию Laravel для production deployment
```

## Настройка Telegram бота

После настройки укажите в `.env` токен бота:

```env
TELEGRAM_BOT_TOKEN=your_actual_bot_token
```

Установите webhook или запустите polling:

```bash
php artisan telegram:set-webhook
```

## Устранение проблем

### Проблемы с правами доступа

```bash
sudo chown -R $USER:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### Проблемы с composer

```bash
composer clear-cache
composer install --no-cache
```

### Проблемы с npm

```bash
rm -rf node_modules package-lock.json
npm install
```

## Полезные команды

```bash
# Очистить все кеши
php artisan optimize:clear

# Проверить конфигурацию
php artisan config:show

# Проверить маршруты
php artisan route:list

# Запустить тесты
php artisan test
```
